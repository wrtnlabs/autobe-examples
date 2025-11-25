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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerOrdersOrderNumberItems(props: {
  seller: SellerPayload;
  orderNumber: string;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  // 1. Find the target order
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or access denied.", 404);
  }

  // 2. Find and check the product
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.body.shopping_mall_product_id,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
      NOT: { business_status: { in: ["archived", "blocked"] } },
    },
  });
  if (!product) {
    throw new HttpException("Product not found or unavailable.", 404);
  }

  // 3. Find and check the SKU
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.body.shopping_mall_product_sku_id,
      shopping_mall_product_id: product.id,
      deleted_at: null,
      NOT: { status: { in: ["archived", "out_of_stock"] } },
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found or unavailable.", 404);
  }
  if (sku.stock < props.body.quantity) {
    throw new HttpException("Insufficient inventory for this SKU.", 409);
  }

  // 4. Uniqueness: ensure no duplicate item for this order and SKU
  const existingItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_sku_id: sku.id,
        deleted_at: null,
      },
    });
  if (existingItem) {
    throw new HttpException(
      "Item for this SKU already exists in the order.",
      409,
    );
  }

  // 5. Transaction: insert the order item and update SKU inventory
  let createdItem: any = undefined;
  try {
    const now = toISOStringSafe(new Date());
    await MyGlobal.prisma.$transaction(async (tx) => {
      createdItem = await tx.shopping_mall_order_items.create({
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
      await tx.shopping_mall_product_skus.update({
        where: { id: sku.id },
        data: { stock: sku.stock - props.body.quantity, updated_at: now },
      });
    });
  } catch (err) {
    throw new HttpException(
      "Failed to create order item (possibly duplicate or integrity error).",
      400,
    );
  }
  if (!createdItem) {
    throw new HttpException("Order item creation failed.", 500);
  }

  // 6. Compose summary objects for return DTO
  const orderSummary: IShoppingMallOrder.ISummary = {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at:
      order.deleted_at !== null && order.deleted_at !== undefined
        ? toISOStringSafe(order.deleted_at)
        : null,
  };

  const sellerSummary: IShoppingMallSeller.ISummary = {
    id: product.shopping_mall_seller_id,
    business_name: (await MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: product.shopping_mall_seller_id },
    }))!.business_name,
  };

  const productSummary: IShoppingMallProduct.ISummary = {
    id: product.id,
    title: product.title,
    default_price: product.default_price,
    business_status: product.business_status,
    seller: sellerSummary,
    categories: [],
    created_at: toISOStringSafe(product.created_at),
  };

  const skuSummary: IShoppingMallProductSku.ISummary = {
    id: sku.id,
    code: sku.sku_code,
    product_title: product.title,
    option_summary: "",
    in_stock: sku.stock - props.body.quantity > 0,
  };

  // 7. Return the fully composed IShoppingMallOrderItem
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
    deleted_at:
      createdItem.deleted_at !== null && createdItem.deleted_at !== undefined
        ? toISOStringSafe(createdItem.deleted_at)
        : null,
  };
}
