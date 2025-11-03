import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSellerProfilesId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, id } = props;

  const sellerProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: { id },
      select: { shopping_mall_seller_id: true },
    });

  if (sellerProfile.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own seller profile",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_seller_profiles.delete({
    where: { id },
  });
}
