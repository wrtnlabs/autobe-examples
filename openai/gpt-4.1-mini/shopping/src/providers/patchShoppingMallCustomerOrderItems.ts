import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function patchShoppingMallCustomerOrderItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const {
    status,
    productId,
    variantId,
    sellerId,
    orderId,
    createdAtStart,
    createdAtEnd,
    updatedAtStart,
    updatedAtEnd,
    page = 1,
    limit = 100,
  } = props.body;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_order_itemsWhereInput = {
    deleted_at: null,
    order: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    ...(status ? { status } : {}),
    ...(orderId ? { shopping_mall_order_id: orderId } : {}),
    ...(variantId ? { shopping_mall_product_variant_id: variantId } : {}),
  };
  if (productId !== undefined || sellerId !== undefined) {
    where.productVariant = {
      deleted_at: null,
      ...(productId ? { shopping_mall_product_id: productId } : {}),
      ...(sellerId
        ? {
            product: {
              deleted_at: null,
              shopping_mall_seller_id: sellerId,
            },
          }
        : {}),
    };
  }
  if (createdAtStart !== undefined || createdAtEnd !== undefined) {
    where.created_at = {};
    if (createdAtStart !== undefined) where.created_at.gte = createdAtStart;
    if (createdAtEnd !== undefined) where.created_at.lte = createdAtEnd;
  }
  if (updatedAtStart !== undefined || updatedAtEnd !== undefined) {
    where.updated_at = {};
    if (updatedAtStart !== undefined) where.updated_at.gte = updatedAtStart;
    if (updatedAtEnd !== undefined) where.updated_at.lte = updatedAtEnd;
  }
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where,
    select: {
      id: true,
      quantity: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      order: {
        select: {
          id: true,
          order_number: true,
          total_price: true,
          total_quantity: true,
          order_status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          customer: {
            select: {
              id: true,
              email: true,
              display_name: true,
              phone_number: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          price_override: true,
          stock_quantity: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where,
  });
  return {
    data: data.map((row) => ({
      id: row.id,
      quantity: row.quantity,
      status: row.status as
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded",
      createdAt: toISOStringSafe(row.created_at),
      updatedAt: toISOStringSafe(row.updated_at),
      deletedAt: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
      order: {
        id: row.order.id,
        orderNumber: row.order.order_number,
        totalPrice: row.order.total_price,
        totalQuantity: row.order.total_quantity,
        orderStatus: row.order.order_status as
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded",
        createdAt: toISOStringSafe(row.order.created_at),
        updatedAt: toISOStringSafe(row.order.updated_at),
        deletedAt: row.order.deleted_at
          ? toISOStringSafe(row.order.deleted_at)
          : null,
        customer: {
          id: row.order.customer.id,
          email: row.order.customer.email,
          displayName: row.order.customer.display_name ?? null,
          phoneNumber: row.order.customer.phone_number ?? null,
          createdAt: toISOStringSafe(row.order.customer.created_at),
          updatedAt: toISOStringSafe(row.order.customer.updated_at),
        },
      },
      productVariant: {
        id: row.productVariant.id,
        skuCode: row.productVariant.sku_code,
        priceOverride: row.productVariant.price_override ?? null,
        stockQuantity: row.productVariant.stock_quantity,
        createdAt: toISOStringSafe(row.productVariant.created_at),
        updatedAt: toISOStringSafe(row.productVariant.updated_at),
        deletedAt: row.productVariant.deleted_at
          ? toISOStringSafe(row.productVariant.deleted_at)
          : null,
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
