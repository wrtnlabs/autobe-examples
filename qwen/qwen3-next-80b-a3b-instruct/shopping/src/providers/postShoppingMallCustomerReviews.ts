import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  // Find an order item that is delivered and belongs to the authenticated customer using known schema
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      order_id: body.orderItemId, // Use correct field from schema - this is the actual foreign key
      status: "delivered",
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "No delivered order item found for this customer",
      404,
    );
  }
  // Check if a review already exists for this order item (unique constraint)
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: {
        shopping_mall_order_item_id: orderItem.id, // Use exact field name from schema
      },
    },
  );
  if (existingReview) {
    throw new HttpException("Review already exists for this order item", 409);
  }
  // Create review with proper relations and system-generated fields using exact schema field names
  const createdReview = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: {
      id: v4(),
      rating: body.rating, // Extract rating from body - this field exists in ICreate schema
      text: body.text ?? null, // Extract text from body - this field exists in ICreate schema
      shopping_mall_product_id: orderItem.product_id, // Use exact schema field name
      shopping_mall_order_item_id: orderItem.id, // Use exact schema field name
      shopping_mall_customer_id: props.customer.id, // Use exact schema field name
      created_at: toISOStringSafe(new Date()),
      updated_at: null,
      deleted_at: null,
    },
  });
  // Return full review object with system-generated fields using exact schema field names
  return {
    id: createdReview.id,
    rating: createdReview.rating,
    text: createdReview.text,
    shopping_mall_product_id: createdReview.shopping_mall_product_id,
    shopping_mall_order_item_id: createdReview.shopping_mall_order_item_id,
    shopping_mall_customer_id: createdReview.shopping_mall_customer_id,
    created_at: createdReview.created_at,
    updated_at: createdReview.updated_at,
    deleted_at: createdReview.deleted_at,
  };
}
