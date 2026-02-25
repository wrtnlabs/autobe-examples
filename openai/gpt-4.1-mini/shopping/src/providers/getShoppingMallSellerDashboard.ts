import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSellerDashboard> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: {
      id: true,
      approval_status: true,
      deleted_at: true,
    },
  });
  if (
    !seller ||
    seller.deleted_at !== null ||
    seller.approval_status !== "approved"
  ) {
    throw new HttpException("Unauthorized or inactive seller", 403);
  }
  const totalProductsCount = await MyGlobal.prisma.shopping_mall_products.count(
    {
      where: { seller_id: props.seller.id, deleted_at: null },
    },
  );
  const totalOrderItemsCount =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        productVariant: {
          product: { seller_id: props.seller.id, deleted_at: null },
        },
        deleted_at: null,
      },
    });
  const pendingCancellationRequestsCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        orderItem: {
          productVariant: {
            product: { seller_id: props.seller.id, deleted_at: null },
          },
          deleted_at: null,
        },
        seller_approval_status: "pending",
        deleted_at: null,
      },
    });
  const pendingRefundRequestsCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        orderItem: {
          productVariant: {
            product: { seller_id: props.seller.id, deleted_at: null },
          },
          deleted_at: null,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  const orderItemsRaw =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        productVariant: {
          product: { seller_id: props.seller.id, deleted_at: null },
        },
        deleted_at: null,
      },
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
                created_at: true,
                updated_at: true,
                deleted_at: true,
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
    });
  const orderItems: IShoppingMallOrderItem.ISummary[] = orderItemsRaw.map(
    (item) => {
      const status = typia.assert<
        "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
      >(item.status);
      const orderStatus = typia.assert<
        "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
      >(item.order.order_status);
      return {
        id: item.id,
        quantity: item.quantity,
        status: status,
        createdAt: toISOStringSafe(item.created_at),
        updatedAt: toISOStringSafe(item.updated_at),
        deletedAt: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
        order: {
          id: item.order.id,
          orderNumber: item.order.order_number,
          totalPrice: item.order.total_price,
          totalQuantity: item.order.total_quantity,
          orderStatus: orderStatus,
          createdAt: toISOStringSafe(item.order.created_at),
          updatedAt: toISOStringSafe(item.order.updated_at),
          deletedAt: item.order.deleted_at
            ? toISOStringSafe(item.order.deleted_at)
            : null,
          customer: {
            id: item.order.customer.id,
            email: item.order.customer.email,
            createdAt: toISOStringSafe(item.order.customer.created_at),
            updatedAt: toISOStringSafe(item.order.customer.updated_at),
            deletedAt: item.order.customer.deleted_at
              ? toISOStringSafe(item.order.customer.deleted_at)
              : null,
          },
        },
        productVariant: {
          id: item.productVariant.id,
          skuCode: item.productVariant.sku_code,
          priceOverride: item.productVariant.price_override ?? null,
          stockQuantity: item.productVariant.stock_quantity,
          createdAt: toISOStringSafe(item.productVariant.created_at),
          updatedAt: toISOStringSafe(item.productVariant.updated_at),
          deletedAt: item.productVariant.deleted_at
            ? toISOStringSafe(item.productVariant.deleted_at)
            : null,
        },
      };
    },
  );
  return {
    totalProductsCount,
    totalOrderItemsCount,
    pendingCancellationRequestsCount,
    pendingRefundRequestsCount,
    orderItems,
  };
}
