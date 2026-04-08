import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallCustomerCustomerAccount(props: {
  customer: CustomerPayload;
}): Promise<void> {
  // Verify customer exists and is not already deleted
  const existing = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: props.customer.id },
    select: { id: true, deleted_at: true },
  });
  if (existing === null || existing.deleted_at !== null) {
    throw new HttpException("Customer not found", 404);
  }
  // Use transaction to ensure atomic deletion
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete all shipping addresses for this customer
    await tx.ecommerce_mall_shipping_addresses.deleteMany({
      where: { ecommerce_mall_customer_id: props.customer.id },
    });
    // Delete all sessions for this customer
    await tx.ecommerce_mall_customer_sessions.deleteMany({
      where: { ecommerce_mall_customer_id: props.customer.id },
    });
    // Soft delete the customer by setting deleted_at timestamp
    await tx.ecommerce_mall_customers.update({
      where: { id: props.customer.id },
      data: { deleted_at: new Date() },
    });
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommerceMallCustomerCustomerAccount(props: {
//   customer: CustomerPayload;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------