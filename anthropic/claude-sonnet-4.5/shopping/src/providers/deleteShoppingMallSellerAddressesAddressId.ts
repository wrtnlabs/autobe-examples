import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerAddressesAddressId(props: {
  seller: SellerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, addressId } = props;

  // Fetch the address and verify it exists
  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findUniqueOrThrow({
      where: { id: addressId },
    });

  // Authorization: Verify seller owns this address
  if (address.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own addresses",
      403,
    );
  }

  // Soft delete: Set deleted_at timestamp
  await MyGlobal.prisma.shopping_mall_addresses.update({
    where: { id: addressId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
