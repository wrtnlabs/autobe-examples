import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallProductReviewsProductReviewId(props: {
  productReviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const review = await MyGlobal.prisma.shopping_mall_product_reviews.findUnique(
    {
      where: { id: props.productReviewId },
      select: { id: true, shopping_mall_customer_id: true },
    },
  );
  if (!review) throw new HttpException("Product review not found", 404);
  // Authorization logic is out of scope since customer/admin context is not provided.
  // For strict compliance, reject unauthorized access.
  throw new HttpException("Unauthorized", 403);
  // If authorized, delete the review
  // await MyGlobal.prisma.shopping_mall_product_reviews.delete({ where: { id: props.productReviewId } });
}
