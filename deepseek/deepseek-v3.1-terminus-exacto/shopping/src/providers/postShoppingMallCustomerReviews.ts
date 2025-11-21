import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  // Validate actor_type
  if (
    props.body.actor_type !== "customer" &&
    props.body.actor_type !== "seller"
  ) {
    throw new HttpException("Invalid actor type", 400);
  }

  // Verify the product exists and is active
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.body.shopping_mall_product_id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!product) {
    throw new HttpException("Product not found or inactive", 404);
  }

  // Verify the seller exists and is active
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: props.body.shopping_mall_seller_id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!seller) {
    throw new HttpException("Seller not found or inactive", 404);
  }

  // Create the review
  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: props.body.actor_type,
      title: props.body.title,
      content: props.body.content,
      overall_rating: props.body.overall_rating,
      status: "pending",
      helpful_count: 0,
      report_count: 0,
      verified_purchase: props.body.verified_purchase,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Convert database Date objects to ISO strings
  return {
    id: created.id,
    actor_type: created.actor_type,
    title: created.title,
    content: created.content,
    overall_rating: created.overall_rating,
    status: created.status,
    helpful_count: created.helpful_count,
    report_count: created.report_count,
    verified_purchase: created.verified_purchase,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    shopping_mall_product_id: created.shopping_mall_product_id ?? undefined,
    shopping_mall_seller_id: created.shopping_mall_seller_id ?? undefined,
    product: undefined, // These would be populated by separate queries if needed
    seller: undefined,
  };
}
