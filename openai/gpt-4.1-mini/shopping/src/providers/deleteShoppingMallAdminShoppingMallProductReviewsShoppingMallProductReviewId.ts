import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallProductReviewsShoppingMallProductReviewId(props: {
  admin: AdminPayload;
  shoppingMallProductReviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.shopping_mall_product_reviews.findUnique({
      where: { id: props.shoppingMallProductReviewId },
    });

  if (!existing) {
    throw new HttpException("Product review not found.", 404);
  }

  await MyGlobal.prisma.shopping_mall_product_reviews.delete({
    where: { id: props.shoppingMallProductReviewId },
  });
}
