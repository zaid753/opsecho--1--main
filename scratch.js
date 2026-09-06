const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const incidents = await prisma.incident.findMany()
  console.log(JSON.stringify(incidents, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
