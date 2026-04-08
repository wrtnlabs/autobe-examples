import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallMemberAddressesAddressId(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find address and verify ownership
  const address =
    await MyGlobal.prisma.ecommerce_mall_customer_addresses.findUnique({
      where: {
        id: props.addressId,
      },
      select: {
        id: true,
        ecommerce_mall_member_id: true,
        deleted_at: true,
      },
    });
  if (address === null) {
    throw new HttpException("Address not found", 404);
  }
  // Verify ownership
  if (address.ecommerce_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Check if already deleted
  if (address.deleted_at !== null) {
    throw new HttpException("Address not found", 404);
  }
  // Step 3: Check for pending orders referencing this address
  const pendingOrders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: {
      ecommerce_mall_customer_address_id: props.addressId,
      deleted_at: null,
      status: {
        in: ["paid", "shipped", "cancelled"],
      },
    },
    select: { id: true },
  });
  if (pendingOrders.length > 0) {
    throw new HttpException("Address is referenced by pending orders", 409);
  }
  // Step 4: Check if this is the only active address
  const activeAddressCount =
    await MyGlobal.prisma.ecommerce_mall_customer_addresses.count({
      where: {
        ecommerce_mall_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (activeAddressCount === 1) {
    throw new HttpException("Customer must have at least one address", 409);
  }
  // Step 5: Soft delete
  await MyGlobal.prisma.ecommerce_mall_customer_addresses.update({
    where: {
      id: props.addressId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
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
// export async function deleteEcommerceMallMemberAddressesAddressId(props: {
//   member: MemberPayload;
//   addressId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------