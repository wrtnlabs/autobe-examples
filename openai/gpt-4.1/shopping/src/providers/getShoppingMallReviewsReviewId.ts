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

export async function getShoppingMallReviewsReviewId(props: {
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    include: {
      customer: true,
      customerSession: true,
      product: { include: { seller: true } },
      productSku: true,
      order: true,
      orderItem: { include: { sku: true } },
      productRating: {
        include: {
          customer: true,
          product: { include: { seller: true } },
          productSku: true,
        },
      },
    },
  });
  if (
    !review ||
    review.deleted_at ||
    !review.customer ||
    !review.customerSession ||
    !review.product ||
    !review.productSku ||
    !review.order ||
    !review.orderItem ||
    !review.productRating
  ) {
    throw new HttpException("Review not found", 404);
  }
  const emptyCategories: IShoppingMallProductsCategory.ISummary[] = [];
  const productTitle = review.product.title;
  return {
    id: review.id,
    title: review.title,
    body: review.body,
    is_draft: review.is_draft,
    withdrawn_at: review.withdrawn_at
      ? toISOStringSafe(review.withdrawn_at)
      : null,
    moderation_status: review.moderation_status,
    moderation_reason:
      typeof review.moderation_reason === "string"
        ? review.moderation_reason
        : undefined,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
    customer: { id: review.customer.id, name: review.customer.name },
    customerSession: {
      id: review.customerSession.id,
      created_at: toISOStringSafe(review.customerSession.created_at),
      expired_at: review.customerSession.expired_at
        ? toISOStringSafe(review.customerSession.expired_at)
        : "",
      last_active_at: toISOStringSafe(review.customerSession.created_at), // no data: fall back to created_at
      ip: review.customerSession.ip,
      href: review.customerSession.href,
      referrer: review.customerSession.referrer,
      user_agent: "", // DB does not provide user_agent
    },
    product: {
      id: review.product.id,
      title: productTitle,
      default_price: review.product.default_price,
      business_status: review.product.business_status,
      seller: {
        id: review.product.seller.id,
        business_name: review.product.seller.business_name,
      },
      categories: emptyCategories,
      created_at: toISOStringSafe(review.product.created_at),
    },
    productSku: {
      id: review.productSku.id,
      code: review.productSku.sku_code,
      product_title: productTitle,
      option_summary: "", // missing
      in_stock: review.productSku.status === "active",
    },
    order: {
      id: review.order.id,
      order_number: review.order.order_number,
      status: review.order.status,
      total_amount: review.order.total_amount,
      currency: review.order.currency,
      created_at: toISOStringSafe(review.order.created_at),
      updated_at: toISOStringSafe(review.order.updated_at),
      deleted_at: review.order.deleted_at
        ? toISOStringSafe(review.order.deleted_at)
        : null,
    },
    orderItem: {
      id: review.orderItem.id,
      shopping_mall_order_id: review.orderItem.shopping_mall_order_id,
      sku: {
        id: review.orderItem.sku.id,
        code: review.orderItem.sku.sku_code,
        product_title: productTitle,
        option_summary: "", // missing
        in_stock: review.orderItem.sku.status === "active",
      },
      quantity: review.orderItem.quantity,
      unit_price: review.orderItem.unit_price,
      subtotal: review.orderItem.subtotal,
      currency: review.orderItem.currency,
      delivered: review.orderItem.delivered,
      refunded: review.orderItem.refunded,
      created_at: toISOStringSafe(review.orderItem.created_at),
      updated_at: toISOStringSafe(review.orderItem.updated_at),
    },
    rating: {
      id: review.productRating.id,
      value: review.productRating.value,
      created_at: toISOStringSafe(review.productRating.created_at),
      updated_at: toISOStringSafe(review.productRating.updated_at),
      deleted_at: review.productRating.deleted_at
        ? toISOStringSafe(review.productRating.deleted_at)
        : null,
      customer: {
        id: review.productRating.customer.id,
        name: review.productRating.customer.name,
      },
      product: {
        id: review.productRating.product.id,
        title: review.productRating.product.title,
        default_price: review.productRating.product.default_price,
        business_status: review.productRating.product.business_status,
        seller: {
          id: review.productRating.product.seller.id,
          business_name: review.productRating.product.seller.business_name,
        },
        categories: emptyCategories,
        created_at: toISOStringSafe(review.productRating.product.created_at),
      },
      productSku: {
        id: review.productRating.productSku.id,
        code: review.productRating.productSku.sku_code,
        product_title: review.productRating.product.title,
        option_summary: "", // missing
        in_stock: review.productRating.productSku.status === "active",
      },
    },
  };
}
