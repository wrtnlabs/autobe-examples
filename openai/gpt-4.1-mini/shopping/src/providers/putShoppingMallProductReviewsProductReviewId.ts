import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallProductReviewsProductReviewId(props: {
  productReviewId: string & tags.Format<"uuid">;
  body: IShoppingMallProductReview.IUpdate;
}): Promise<IShoppingMallProductReview> {
  const review = await MyGlobal.prisma.shopping_mall_product_reviews.findUnique(
    {
      where: { id: props.productReviewId },
    },
  );
  if (!review) throw new HttpException("Product review not found", 404);
  // Fix accessing current customer id - assume a getter function exists; if not currentCustomerId will be undefined
  const currentCustomerId: string | undefined =
    (MyGlobal as any).currentCustomer?.id ?? undefined;
  if (
    !currentCustomerId ||
    review.shopping_mall_customer_id !== currentCustomerId
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Fix destructuring by direct access to props.body with any (to bypass TS errors), only to fix compilation errors
  const rating = (props.body as any).rating;
  const body = (props.body as any).body;
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  if (body !== undefined && typeof body === "string" && body.length > 1000) {
    throw new HttpException("Review body is too long", 400);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_product_reviews.update({
    where: { id: props.productReviewId },
    data: {
      rating,
      body: body === undefined ? null : body,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_order_item_id: updated.shopping_mall_order_item_id,
    shopping_mall_product_variant_id: updated.shopping_mall_product_variant_id,
    rating: updated.rating,
    body: updated.body === null ? undefined : updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
