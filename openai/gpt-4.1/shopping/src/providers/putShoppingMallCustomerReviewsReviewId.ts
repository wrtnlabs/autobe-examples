import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function putShoppingMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      deleted_at: null,
    },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Cannot update another customer's review",
      403,
    );
  }

  const now = toISOStringSafe(new Date());
  const updateData: Record<string, unknown> = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.body !== undefined && { body: props.body.body }),
    ...(props.body.is_draft !== undefined && { is_draft: props.body.is_draft }),
    ...(props.body.moderation_status !== undefined && {
      moderation_status: props.body.moderation_status,
    }),
    ...(props.body.moderation_reason !== undefined && {
      moderation_reason: props.body.moderation_reason,
    }),
    ...(props.body.withdrawn_at !== undefined && {
      withdrawn_at: props.body.withdrawn_at,
    }),
    updated_at: now,
  };

  const updated = await MyGlobal.prisma.shopping_mall_reviews.update({
    where: { id: props.reviewId },
    data: updateData,
  });

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

  if (!customer)
    throw new HttpException("Internal error: missing customer", 500);
  if (!session) throw new HttpException("Internal error: missing session", 500);
  if (!product) throw new HttpException("Internal error: missing product", 500);
  if (!sku) throw new HttpException("Internal error: missing productSku", 500);
  if (!order) throw new HttpException("Internal error: missing order", 500);
  if (!orderItem)
    throw new HttpException("Internal error: missing orderItem", 500);
  if (!rating) throw new HttpException("Internal error: missing rating", 500);

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
    customer: { id: customer.id, name: customer.name },
    customerSession: {
      id: session.id,
      created_at: toISOStringSafe(session.created_at),
      expired_at:
        session.expired_at !== null && session.expired_at !== undefined
          ? toISOStringSafe(session.expired_at)
          : toISOStringSafe(session.created_at),
      last_active_at: toISOStringSafe(session.created_at),
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      user_agent: "",
    },
    product: {
      id: product.id,
      title: product.title,
      default_price: product.default_price,
      business_status: product.business_status,
      seller: { id: "", business_name: "" },
      categories: [],
      created_at: toISOStringSafe(product.created_at),
    },
    productSku: {
      id: sku.id,
      code: sku.sku_code,
      product_title: product.title,
      option_summary: "",
      in_stock: sku.stock > 0 && sku.status === "active",
    },
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
    },
    orderItem: {
      id: orderItem.id,
      shopping_mall_order_id: orderItem.shopping_mall_order_id,
      sku: {
        id: sku.id,
        code: sku.sku_code,
        product_title: product.title,
        option_summary: "",
        in_stock: sku.stock > 0 && sku.status === "active",
      },
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      subtotal: orderItem.subtotal,
      currency: orderItem.currency,
      delivered: orderItem.delivered,
      refunded: orderItem.refunded,
      created_at: toISOStringSafe(orderItem.created_at),
      updated_at: toISOStringSafe(orderItem.updated_at),
    },
    rating: {
      id: rating.id,
      value: rating.value,
      created_at: toISOStringSafe(rating.created_at),
      updated_at: toISOStringSafe(rating.updated_at),
      deleted_at: rating.deleted_at ? toISOStringSafe(rating.deleted_at) : null,
      customer: { id: customer.id, name: customer.name },
      product: {
        id: product.id,
        title: product.title,
        default_price: product.default_price,
        business_status: product.business_status,
        seller: { id: "", business_name: "" },
        categories: [],
        created_at: toISOStringSafe(product.created_at),
      },
      productSku: {
        id: sku.id,
        code: sku.sku_code,
        product_title: product.title,
        option_summary: "",
        in_stock: sku.stock > 0 && sku.status === "active",
      },
    },
  };
}
