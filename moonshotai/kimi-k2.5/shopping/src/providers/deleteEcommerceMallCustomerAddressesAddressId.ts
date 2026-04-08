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

export async function deleteEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify address exists and belongs to the authenticated customer
  // Using findFirst to check both ID and ownership in one query
  // This prevents address enumeration attacks by not revealing existence
  const address = await MyGlobal.prisma.ecommerce_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      customer_id: props.customer.id,
    },
    select: {
      id: true,
      is_default: true,
    },
  } satisfies Prisma.ecommerce_mall_addressesFindFirstArgs);
  // Return 404 if address not found or doesn't belong to customer
  // This prevents address enumeration attacks
  if (address === null) {
    throw new HttpException("Address not found", 404);
  }
  // Delete the address permanently
  // Orders preserve address snapshots, so historical data remains intact
  await MyGlobal.prisma.ecommerce_mall_addresses.delete({
    where: { id: props.addressId },
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
// export async function deleteEcommerceMallCustomerAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------