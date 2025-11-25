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

export async function postShoppingMallReviews(props: {
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.body.shopping_mall_order_item_id, deleted_at: null },
  });
  if (
    !orderItem ||
    orderItem.shopping_mall_product_id !==
      props.body.shopping_mall_product_id ||
    orderItem.shopping_mall_product_sku_id !==
      props.body.shopping_mall_product_sku_id ||
    orderItem.shopping_mall_order_id !== props.body.shopping_mall_order_id
  ) {
    throw new HttpException(
      "Purchase verification failed: The product SKU/order combination does not match a valid order item.",
      400,
    );
  }

  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: {
        shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
      },
    },
  );
  if (existingReview) {
    throw new HttpException(
      "Duplicate review is not permitted: This order item was already reviewed.",
      409,
    );
  }

  // Fetch the related order to determine customer (for review ownership)
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.body.shopping_mall_order_id },
  });

  const now = toISOStringSafe(new Date());
  const reviewId = v4();
  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: {
      id: reviewId,
      title: props.body.title,
      body: props.body.body,
      is_draft: props.body.is_draft,
      moderation_status: props.body.moderation_status,
      withdrawn_at: props.body.withdrawn_at ?? null,
      shopping_mall_customer_id: order.shopping_mall_customer_id,
      shopping_mall_customer_session_id:
        (props.body as any).shopping_mall_customer_session_id !== undefined
          ? (props.body as any).shopping_mall_customer_session_id
          : undefined,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
      shopping_mall_product_rating_id:
        props.body.shopping_mall_product_rating_id,
      moderation_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const [customer, product, sku, rating, customerSession] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: created.shopping_mall_customer_id },
    }),
    MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: created.shopping_mall_product_id },
    }),
    MyGlobal.prisma.shopping_mall_product_skus.findUniqueOrThrow({
      where: { id: created.shopping_mall_product_sku_id },
    }),
    MyGlobal.prisma.shopping_mall_product_ratings.findUniqueOrThrow({
      where: { id: created.shopping_mall_product_rating_id },
    }),
    created.shopping_mall_customer_session_id
      ? MyGlobal.prisma.shopping_mall_customer_sessions.findUniqueOrThrow({
          where: { id: created.shopping_mall_customer_session_id },
        })
      : Promise.resolve(null),
  ]);

  // (Order is already loaded above; fetch orderItem summary fields)
  const orderItemSummary = {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    sku: {
      id: sku.id,
      code: sku.sku_code,
      product_title: product.title,
      option_summary: sku.sku_code,
      in_stock:
        sku.status === "active" && sku.deleted_at === null && sku.stock > 0,
    },
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    subtotal: orderItem.subtotal,
    currency: orderItem.currency,
    delivered: orderItem.delivered,
    refunded: orderItem.refunded,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
  };

  return {
    id: created.id,
    title: created.title,
    body: created.body,
    is_draft: created.is_draft,
    withdrawn_at:
      created.withdrawn_at !== undefined && created.withdrawn_at !== null
        ? toISOStringSafe(created.withdrawn_at)
        : null,
    moderation_status: created.moderation_status,
    moderation_reason: created.moderation_reason ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : null,
    customer: { id: customer.id, name: customer.name },
    customerSession: customerSession
      ? {
          id: customerSession.id,
          created_at: toISOStringSafe(customerSession.created_at),
          expired_at:
            customerSession.expired_at !== undefined &&
            customerSession.expired_at !== null
              ? toISOStringSafe(customerSession.expired_at)
              : toISOStringSafe(customerSession.created_at),
          last_active_at: toISOStringSafe(
            (customerSession as any).updated_at !== undefined &&
              (customerSession as any).updated_at !== null
              ? (customerSession as any).updated_at
              : customerSession.created_at,
          ),
          ip: customerSession.ip,
          href: customerSession.href,
          referrer: customerSession.referrer,
          user_agent: "",
        }
      : {
          id: "",
          created_at: now,
          expired_at: now,
          last_active_at: now,
          ip: "",
          href: "",
          referrer: "",
          user_agent: "",
        },
    product: {
      id: product.id,
      title: product.title,
      default_price: product.default_price,
      business_status: product.business_status,
      seller: { id: product.shopping_mall_seller_id, business_name: "" },
      categories: [],
      created_at: toISOStringSafe(product.created_at),
    },
    productSku: {
      id: sku.id,
      code: sku.sku_code,
      product_title: product.title,
      option_summary: sku.sku_code,
      in_stock:
        sku.status === "active" && sku.deleted_at === null && sku.stock > 0,
    },
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at:
        order.deleted_at !== undefined && order.deleted_at !== null
          ? toISOStringSafe(order.deleted_at)
          : null,
    },
    orderItem: orderItemSummary,
    rating: {
      id: rating.id,
      value: rating.value,
      created_at: toISOStringSafe(rating.created_at),
      updated_at: toISOStringSafe(rating.updated_at),
      deleted_at:
        rating.deleted_at !== undefined && rating.deleted_at !== null
          ? toISOStringSafe(rating.deleted_at)
          : null,
      customer: { id: customer.id, name: customer.name },
      product: {
        id: product.id,
        title: product.title,
        default_price: product.default_price,
        business_status: product.business_status,
        seller: { id: product.shopping_mall_seller_id, business_name: "" },
        categories: [],
        created_at: toISOStringSafe(product.created_at),
      },
      productSku: {
        id: sku.id,
        code: sku.sku_code,
        product_title: product.title,
        option_summary: sku.sku_code,
        in_stock:
          sku.status === "active" && sku.deleted_at === null && sku.stock > 0,
      },
    },
  };
}
