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

export async function deleteEcommerceMallCustomerCustomersMeAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find address - must exist and not already deleted
  const address =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
      where: {
        id: props.addressId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        is_default: true,
      },
    });
  // Address not found or already deleted
  if (address === null) {
    throw new HttpException("Address not found", 404);
  }
  // Check ownership - only owner can delete their address
  if (address.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete: set deleted_at timestamp as ISO string and clear is_default if needed
  await MyGlobal.prisma.ecommerce_mall_shipping_addresses.update({
    where: { id: props.addressId },
    data: {
      deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
      ...(address.is_default && { is_default: false }),
    },
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
// export async function deleteEcommerceMallCustomerCustomersMeAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------