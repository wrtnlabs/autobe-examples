import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerProductRatings(props: {
  customer: CustomerPayload;
  body: IShoppingMallProductRating.ICreate;
}): Promise<IShoppingMallProductRating> {
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.body.shopping_mall_order_item_id },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found.", 404);
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.body.shopping_mall_order_id },
  });
  if (!order || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Order not found or not owned by customer.", 404);
  }
  if (orderItem.shopping_mall_order_id !== order.id) {
    throw new HttpException(
      "Order item is not part of the specified order.",
      409,
    );
  }
  if (
    orderItem.shopping_mall_product_sku_id !==
    props.body.shopping_mall_product_sku_id
  ) {
    throw new HttpException(
      "Order item does not reference the given SKU.",
      409,
    );
  }
  const existing =
    await MyGlobal.prisma.shopping_mall_product_ratings.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
        shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
      },
    });
  if (existing) {
    throw new HttpException("You have already rated this order item.", 409);
  }
  const productSku =
    await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
      where: { id: props.body.shopping_mall_product_sku_id },
    });
  if (!productSku) throw new HttpException("SKU not found.", 404);
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productSku.shopping_mall_product_id },
  });
  if (!product) throw new HttpException("Product not found.", 404);
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_ratings.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: props.customer.id,
      shopping_mall_customer_session_id: props.customer.session_id,
      shopping_mall_product_id: product.id,
      shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
      value: props.body.value,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id },
  });
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: props.customer.session_id },
    });
  return {
    id: created.id,
    customer:
      customer !== null
        ? { id: customer.id, name: customer.name }
        : { id: "", name: "" },
    session:
      session !== null && session !== undefined
        ? {
            id: session.id,
            created_at: toISOStringSafe(session.created_at),
            expired_at: toISOStringSafe(
              session.expired_at ?? session.created_at ?? new Date(),
            ), // always provide a string & Format<"date-time">
            last_active_at: toISOStringSafe(session.created_at),
            ip: session.ip,
            href: session.href,
            referrer: session.referrer,
            user_agent: "",
          }
        : {
            id: "",
            created_at: toISOStringSafe(new Date()),
            expired_at: toISOStringSafe(new Date()),
            last_active_at: toISOStringSafe(new Date()),
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
      id: productSku.id,
      code: productSku.sku_code,
      product_title: product.title,
      option_summary: "",
      in_stock: productSku.stock > 0 && !productSku.deleted_at,
    },
    order: {
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
    },
    order_item_id: orderItem.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      created.shopping_mall_customer_session_id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_order_item_id: created.shopping_mall_order_item_id,
    value: created.value,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
