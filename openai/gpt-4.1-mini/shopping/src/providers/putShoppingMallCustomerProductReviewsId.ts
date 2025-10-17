import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerProductReviewsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallProductReview.IUpdate;
}): Promise<IShoppingMallProductReview> {
  const { customer, id, body } = props;

  // Fetch review to validate ownership
  const existing =
    await MyGlobal.prisma.shopping_mall_product_reviews.findUnique({
      where: { id },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_product_id: true,
        shopping_mall_order_id: true,
        rating: true,
        review_text: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!existing) {
    throw new HttpException("Product review not found", 404);
  }

  if (existing.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Unauthorized: cannot update others' reviews", 403);
  }

  // Prepare updated_at
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_product_reviews.update({
    where: { id },
    data: {
      rating: body.rating,
      review_text: body.review_text ?? null,
      status: "pending",
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    rating: updated.rating,
    review_text: updated.review_text ?? null,
    status: "pending",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
