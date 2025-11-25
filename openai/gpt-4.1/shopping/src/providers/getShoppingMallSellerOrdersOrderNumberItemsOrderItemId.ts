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

export async function getShoppingMallSellerOrdersOrderNumberItemsOrderItemId(props: {
  seller: SellerPayload;
  orderNumber: string;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // Find the order (must belong to seller)
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      order_number: true,
      status: true,
      total_amount: true,
      currency: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!order) throw new HttpException("Order not found or access denied", 404);
  // Find the order item
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          default_price: true,
          business_status: true,
          shopping_mall_seller_id: true,
          created_at: true,
          seller: {
            select: {
              id: true,
              business_name: true,
            },
          },
          // categories excluded (not present in schema)
        },
      },
      sku: {
        select: {
          id: true,
          sku_code: true,
          status: true,
          price: true,
          stock: true,
          created_at: true,
          // No .product included
          deleted_at: true,
        },
      },
    },
  });
  if (!item) throw new HttpException("Order item not found", 404);
  const orderSummary = {
    id: item.shopping_mall_order_id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
  };
  const productSummary = {
    id: item.product.id,
    title: item.product.title,
    default_price: item.product.default_price,
    business_status: item.product.business_status,
    seller: {
      id: item.product.seller.id,
      business_name: item.product.seller.business_name,
    },
    categories: [], // Not present, provide empty
    created_at: toISOStringSafe(item.product.created_at),
  };
  const skuSummary = {
    id: item.sku.id,
    code: item.sku.sku_code,
    product_title: item.product.title, // fallback (original code tried item.sku.product.title)
    option_summary: item.sku.status,
    in_stock: item.sku.stock > 0,
  };
  return {
    id: item.id,
    order: orderSummary,
    product: productSummary,
    sku: skuSummary,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
    currency: item.currency,
    delivered: item.delivered,
    refunded: item.refunded,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  };
}
