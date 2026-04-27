import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallCustomerTransformer } from "../transformers/ECommerceMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAdministratorCustomersCustomerIdUnban(props: {
  administrator: AdministratorPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallCustomer> {
  // Verify the customer exists — throws 404 automatically if not found
  const customer =
    await MyGlobal.prisma.e_commerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      select: { id: true, banned_at: true },
    });
  // Verify the customer is currently banned
  if (customer.banned_at === null) {
    throw new HttpException("Customer is not currently banned", 422);
  }
  // Lift the ban: clear banned_at, update updated_at with ISO string
  await MyGlobal.prisma.e_commerce_mall_customers.update({
    where: { id: customer.id },
    data: {
      banned_at: null,
      updated_at: new Date().toISOString(),
    },
  });
  // Re-fetch the full customer record with the transformer's select shape
  const updated =
    await MyGlobal.prisma.e_commerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      ...ECommerceMallCustomerTransformer.select(),
    });
  return await ECommerceMallCustomerTransformer.transform(updated);
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
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAdministratorCustomersCustomerIdUnban(props: {
//   administrator: AdministratorPayload;
//   customerId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallCustomer> {
//   const record = await MyGlobal.prisma.e_commerce_mall_customers.findFirstOrThrow({
//     ...ECommerceMallCustomerTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------