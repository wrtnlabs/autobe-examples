import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSellersSellerIdAddressesAddressId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const deleted = await MyGlobal.prisma.shopping_mall_addresses.deleteMany({
    where: {
      id: props.addressId,
      seller: {
        id: props.sellerId,
      },
    },
  });
  if (deleted.count === 0) {
    throw new HttpException(
      "Address not found or does not belong to seller",
      404,
    );
  }
}
