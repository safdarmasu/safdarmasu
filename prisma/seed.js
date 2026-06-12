import prisma from '../src/db.js';

async function main() {
  console.log("Seeding inventory items...");
  
  const items = [
    {
      name: "Ray-Ban RX5154 Clubmaster (Gold)",
      type: "FRAME",
      skuCode: "FRM-RB-5154-GD",
      stock: 15,
      alertLimit: 3,
      price: 4500.00,
      brand: "Ray-Ban",
      color: "Gold",
      modelNumber: "RX5154"
    },
    {
      name: "Oakley Pitchman R (Satin Black)",
      type: "FRAME",
      skuCode: "FRM-OK-PMR-SB",
      stock: 8,
      alertLimit: 2,
      price: 6500.00,
      brand: "Oakley",
      color: "Satin Black",
      modelNumber: "Pitchman R"
    },
    {
      name: "Blue Cut Progressive Polycarbonate",
      type: "LENS",
      skuCode: "LNS-BC-PROG-PC",
      stock: 20,
      alertLimit: 5,
      price: 2500.00
    },
    {
      name: "Anti-Glare Single Vision CR39",
      type: "LENS",
      skuCode: "LNS-AG-SV-CR39",
      stock: 40,
      alertLimit: 10,
      price: 800.00
    },
    {
      name: "Transition Photochromic Active",
      type: "LENS",
      skuCode: "LNS-TR-PHOTO-ACT",
      stock: 12,
      alertLimit: 2,
      price: 3500.00
    }
  ];

  for (const item of items) {
    await prisma.inventoryItem.upsert({
      where: { skuCode: item.skuCode },
      update: item,
      create: item
    });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch(e => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Note: in Prisma 7 with driver adapter, disconnecting is simple or handled
  });
