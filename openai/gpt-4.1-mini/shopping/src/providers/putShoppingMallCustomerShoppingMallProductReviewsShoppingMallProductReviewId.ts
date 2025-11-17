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

export async function putShoppingMallCustomerShoppingMallProductReviewsShoppingMallProductReviewId(props: {
  customer: CustomerPayload;
  shoppingMallProductReviewId: string & tags.Format<"uuid">;
  body: IShoppingMallProductReview.IUpdate;
}): Promise<IShoppingMallProductReview> {
  const existing =
    await MyGlobal.prisma.shopping_mall_product_reviews.findUnique({
      where: { id: props.shoppingMallProductReviewId },
    });

  if (!existing) {
    throw new HttpException("Product review not found", 404);
  }

  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_product_reviews.update({
    where: { id: props.shoppingMallProductReviewId },
    data: {
      rating: props.body.rating,
      title: props.body.title,
      body: props.body.body,
      moderation_status: props.body.moderation_status,
      updated_at: new Date(props.body.updated_at),
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      updated.shopping_mall_customer_session_id,
    rating: updated.rating,
    title: updated.title,
    body: updated.body,
    moderation_status: typia.assert<"pending" | "approved" | "rejected">(
      updated.moderation_status,
    ),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
