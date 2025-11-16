import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSellersSellerIdAddressesAddressId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the address by addressId and sellerId to ensure ownership, existence, and precise linkage.
  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      seller: { id: props.sellerId },
    },
  });
  if (!address) {
    // Address does not exist or not linked to sellerId
    throw new HttpException("Address not found for this seller.", 404);
  }
  // 2. Enforce that caller is either the owner-seller or an admin (not part of interface here; only seller provided).
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "Forbidden: You do not have permission to delete this address.",
      403,
    );
  }
  // 3. Hard-delete (no soft delete as per schema)
  await MyGlobal.prisma.shopping_mall_addresses.delete({
    where: {
      id: props.addressId,
    },
  });
}
