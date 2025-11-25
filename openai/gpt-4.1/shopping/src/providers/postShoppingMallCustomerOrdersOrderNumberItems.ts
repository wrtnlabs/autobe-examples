import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderNumberItems(props: {
  customer: CustomerPayload;
  orderNumber: string;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or not owned by customer", 404);
  }

  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.body.shopping_mall_product_id,
      deleted_at: null,
      business_status: "published",
    },
  });
  if (!product) {
    throw new HttpException("Invalid or unavailable product.", 400);
  }

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.body.shopping_mall_product_sku_id,
      shopping_mall_product_id: product.id,
      deleted_at: null,
      status: "active",
    },
  });
  if (!sku) {
    throw new HttpException(
      "SKU not found, inactive, or not part of specified product.",
      400,
    );
  }
  if (sku.stock < props.body.quantity) {
    throw new HttpException(
      "Insufficient inventory for the requested SKU.",
      400,
    );
  }

  const duplicateItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_sku_id: sku.id,
        deleted_at: null,
      },
    });
  if (duplicateItem) {
    throw new HttpException("This SKU is already added to the order.", 409);
  }

  const expectedSubtotal = props.body.quantity * props.body.unit_price;
  if (props.body.subtotal !== expectedSubtotal) {
    throw new HttpException(
      "Subtotal does not match quantity × unit_price.",
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const createdItem = await MyGlobal.prisma.$transaction(async (tx) => {
    const newItem = await tx.shopping_mall_order_items.create({
      data: {
        id: v4(),
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: product.id,
        shopping_mall_product_sku_id: sku.id,
        quantity: props.body.quantity,
        unit_price: props.body.unit_price,
        subtotal: props.body.subtotal,
        currency: props.body.currency,
        delivered: props.body.delivered,
        refunded: props.body.refunded,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Decrease stock for SKU
    await tx.shopping_mall_product_skus.update({
      where: { id: sku.id },
      data: { stock: sku.stock - props.body.quantity, updated_at: now },
    });
    return newItem;
  });

  const orderSummary = {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
  };

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: product.shopping_mall_seller_id },
  });

  // Build product summary and only assign 'seller' if defined
  const productSummary: any = {
    id: product.id,
    title: product.title,
    default_price: product.default_price,
    business_status: product.business_status,
    categories: [], // Category lookup omitted for brevity
    created_at: toISOStringSafe(product.created_at),
  };
  if (seller) {
    productSummary.seller = {
      id: seller.id,
      business_name: seller.business_name,
      categories: [],
      created_at: null,
    };
  }
  const skuSummary = {
    id: sku.id,
    code: sku.sku_code,
    product_title: product.title,
    option_summary: "",
    in_stock: sku.stock - props.body.quantity > 0,
  };

  return {
    id: createdItem.id,
    order: orderSummary,
    product: productSummary,
    sku: skuSummary,
    quantity: createdItem.quantity,
    unit_price: createdItem.unit_price,
    subtotal: createdItem.subtotal,
    currency: createdItem.currency,
    delivered: createdItem.delivered,
    refunded: createdItem.refunded,
    created_at: toISOStringSafe(createdItem.created_at),
    updated_at: toISOStringSafe(createdItem.updated_at),
    deleted_at: createdItem.deleted_at
      ? toISOStringSafe(createdItem.deleted_at)
      : null,
  };
}
