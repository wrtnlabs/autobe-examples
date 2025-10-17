import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSellersSellerId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, sellerId } = props;

  const sellerAccount =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: sellerId },
    });

  if (sellerAccount.id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own seller account",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: sellerId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
