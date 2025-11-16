import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview> {
  // 1. Load the review by ID
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  // 2. Only the original customer can delete
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("You are not the author of this review", 403);
  }

  // 3. Check already deleted/withdrawn
  if (review.deleted_at !== null || review.withdrawn_at !== null) {
    throw new HttpException("Review is already deleted or withdrawn", 400);
  }

  // 4. Check for moderation freeze or other forbidden status (example: "frozen", "dispute_locked")
  if (
    review.moderation_status === "frozen" ||
    review.moderation_status === "dispute_locked"
  ) {
    throw new HttpException(
      "This review cannot be deleted due to platform status",
      403,
    );
  }

  // 5. Soft delete by setting withdrawn_at and deleted_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: {
      withdrawn_at: now,
      deleted_at: now,
      updated_at: now,
    },
  });

  // 6. Fetch all summary reference objects for the DTO
  const [customer, session, product, sku, order, orderItem, rating] =
    await Promise.all([
      MyGlobal.prisma.shopping_mall_customers.findUnique({
        where: { id: updated.shopping_mall_customer_id },
      }),
      MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
        where: { id: updated.shopping_mall_customer_session_id },
      }),
      MyGlobal.prisma.shopping_mall_products.findUnique({
        where: { id: updated.shopping_mall_product_id },
      }),
      MyGlobal.prisma.shopping_mall_product_skus.findUnique({
        where: { id: updated.shopping_mall_product_sku_id },
      }),
      MyGlobal.prisma.shopping_mall_orders.findUnique({
        where: { id: updated.shopping_mall_order_id },
      }),
      MyGlobal.prisma.shopping_mall_order_items.findUnique({
        where: { id: updated.shopping_mall_order_item_id },
      }),
      MyGlobal.prisma.shopping_mall_product_ratings.findUnique({
        where: { id: updated.shopping_mall_product_rating_id },
      }),
    ]);

  if (
    !customer ||
    !session ||
    !product ||
    !sku ||
    !order ||
    !orderItem ||
    !rating
  ) {
    throw new HttpException(
      "Failed to resolve referenced data for review",
      500,
    );
  }

  // Map to DTO summaries (no type assertion, direct values)
  const customerSummary = { id: customer.id, name: customer.name };
  const sessionSummary = {
    id: session.id,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at ?? new Date()),
    last_active_at: toISOStringSafe(session.created_at),
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    user_agent: "",
  };
  const productSummary = {
    id: product.id,
    title: product.title,
    default_price: product.default_price,
    business_status: product.business_status,
    seller: { id: product.shopping_mall_seller_id, business_name: "" },
    categories: [],
    created_at: toISOStringSafe(product.created_at),
  };
  const skuSummary = {
    id: sku.id,
    code: sku.sku_code,
    product_title: product.title,
    option_summary: "",
    in_stock: sku.stock > 0 && sku.status === "active",
  };
  const orderSummary = {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
  };
  const orderItemSummary = {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    sku: skuSummary,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    subtotal: orderItem.subtotal,
    currency: orderItem.currency,
    delivered: orderItem.delivered,
    refunded: orderItem.refunded,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
  };
  const ratingSummary = {
    id: rating.id,
    value: rating.value,
    created_at: toISOStringSafe(rating.created_at),
    updated_at: toISOStringSafe(rating.updated_at),
    deleted_at: rating.deleted_at
      ? toISOStringSafe(rating.deleted_at)
      : undefined,
    customer: customerSummary,
    product: productSummary,
    productSku: skuSummary,
  };

  // 7. Return the mapped DTO
  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    is_draft: updated.is_draft,
    withdrawn_at: updated.withdrawn_at
      ? toISOStringSafe(updated.withdrawn_at)
      : null,
    moderation_status: updated.moderation_status,
    moderation_reason: updated.moderation_reason ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    customer: customerSummary,
    customerSession: sessionSummary,
    product: productSummary,
    productSku: skuSummary,
    order: orderSummary,
    orderItem: orderItemSummary,
    rating: ratingSummary,
  };
}
