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

export async function deleteShoppingMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the address - will throw 404 if not found
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        is_default: true,
      },
    });
  // Verify ownership
  if (address.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Count active addresses for this customer
  const activeAddressCount =
    await MyGlobal.prisma.shopping_mall_customer_addresses.count({
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  // Cannot delete last address
  if (activeAddressCount === 1) {
    throw new HttpException("Cannot delete your last address", 400);
  }
  // Cannot delete default address
  if (address.is_default) {
    throw new HttpException(
      "Cannot delete your default address. Please set another address as default first",
      400,
    );
  }
  // Soft delete the address
  await MyGlobal.prisma.shopping_mall_customer_addresses.update({
    where: { id: props.addressId },
    data: { deleted_at: new Date() },
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
// export async function deleteShoppingMallCustomerAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------