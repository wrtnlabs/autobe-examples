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
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_product_reviews.create({
    data: {
      id: id,
      shopping_mall_customer_id: props.body.shopping_mall_customer_id,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      rating: props.body.rating,
      review_text: props.body.review_text ?? null,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    rating: created.rating,
    review_text: created.review_text ?? null,
    status: typia.assert<"pending" | "approved" | "rejected">(created.status),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
