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

export async function postShoppingMallCustomerProductReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallProductReview.ICreate;
}): Promise<IShoppingMallProductReview> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_product_reviews.create({
    data: {
      id: v4(),
      shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      rating: props.body.rating,
      review_body: props.body.review_body ?? null,
      moderation_status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    rating: created.rating,
    review_body: created.review_body ?? null,
    moderation_status: created.moderation_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
