import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallProductReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallProductReview.ICreate;
}): Promise<IShoppingMallProductReview> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_product_reviews.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_customer_session_id: props.customer.session_id,
      rating: props.body.rating,
      title: props.body.title,
      body: props.body.body,
      moderation_status: typia.assert<"pending" | "approved" | "rejected">(
        props.body.moderation_status,
      ),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      created.shopping_mall_customer_session_id,
    rating: created.rating,
    title: created.title,
    body: created.body,
    moderation_status: typia.assert<"pending" | "approved" | "rejected">(
      created.moderation_status,
    ),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
