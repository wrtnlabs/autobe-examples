import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentOrderItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
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

export async function patchShoppingMallSellerShipmentOrderItems(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentOrderItem.IRequest;
}): Promise<IPageIShoppingMallShipmentOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_shipment_order_itemsWhereInput = {
    ...(props.body.shipmentId != null
      ? { shopping_mall_shipment_id: props.body.shipmentId }
      : {}),
    ...(props.body.orderItemId != null
      ? { shopping_mall_order_item_id: props.body.orderItemId }
      : {}),
    ...(props.body.createdAtFrom != null || props.body.createdAtTo != null
      ? {
          created_at: {
            ...(props.body.createdAtFrom != null
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo != null
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.updatedAtFrom != null || props.body.updatedAtTo != null
      ? {
          updated_at: {
            ...(props.body.updatedAtFrom != null
              ? { gte: props.body.updatedAtFrom }
              : {}),
            ...(props.body.updatedAtTo != null
              ? { lte: props.body.updatedAtTo }
              : {}),
          },
        }
      : {}),
  };
  if (props.body.deletedAt === null || props.body.deletedAt === undefined) {
    where.deleted_at = null;
  } else {
    where.deleted_at = {
      lte: props.body.deletedAt,
    };
  }
  const total = await MyGlobal.prisma.shopping_mall_shipment_order_items.count({
    where,
  });
  const records =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_shipment_id: true,
        shopping_mall_order_item_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shipment: {
          select: {
            id: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            seller: {
              select: {
                id: true,
                email: true,
                shop_name: true,
                shop_description: true,
                logo_uri: true,
                approval_status: true,
                rejection_reason: true,
              },
            },
          },
        },
        orderItem: {
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
        },
      },
    });
  const data = records.map((item) => ({
    id: item.id,
    shoppingMallShipmentId: item.shopping_mall_shipment_id,
    shoppingMallOrderItemId: item.shopping_mall_order_item_id,
    createdAt: (toISOStringSafe(item.created_at ?? new Date()) ??
      "") satisfies string & tags.Format<"date-time">,
    updatedAt: (toISOStringSafe(item.updated_at ?? new Date()) ??
      "") satisfies string & tags.Format<"date-time">,
    deletedAt: (toISOStringSafe(item.deleted_at ?? new Date()) ??
      "") satisfies string & tags.Format<"date-time">,
    shipment: {
      id: item.shipment.id,
      status: item.shipment.status,
      createdAt: (toISOStringSafe(item.shipment.created_at ?? new Date()) ??
        "") satisfies string & tags.Format<"date-time">,
      updatedAt: (toISOStringSafe(item.shipment.updated_at ?? new Date()) ??
        "") satisfies string & tags.Format<"date-time">,
      deletedAt: (toISOStringSafe(item.shipment.deleted_at ?? new Date()) ??
        "") satisfies string & tags.Format<"date-time">,
      seller: {
        id: item.shipment.seller.id,
        email: item.shipment.seller.email,
        shopName: item.shipment.seller.shop_name ?? null,
        shopDescription: item.shipment.seller.shop_description ?? null,
        logoUri: item.shipment.seller.logo_uri ?? null,
        approvalStatus: item.shipment.seller.approval_status,
        rejectionReason: item.shipment.seller.rejection_reason ?? null,
      },
    },
    orderItem: {
      id: item.orderItem.id,
      quantity: item.orderItem.quantity,
      status: typia.assert<
        "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
      >(item.orderItem.status),
      createdAt: (toISOStringSafe(item.orderItem.created_at ?? new Date()) ??
        "") satisfies string & tags.Format<"date-time">,
      updatedAt: (toISOStringSafe(item.orderItem.updated_at ?? new Date()) ??
        "") satisfies string & tags.Format<"date-time">,
      deletedAt: (toISOStringSafe(item.orderItem.deleted_at ?? new Date()) ??
        "") satisfies string & tags.Format<"date-time">,
      order: {
        id: item.orderItem.order.id,
        orderNumber: item.orderItem.order.order_number,
        totalPrice: item.orderItem.order.total_price,
        totalQuantity: item.orderItem.order.total_quantity,
        orderStatus: typia.assert<
          "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
        >(item.orderItem.order.order_status),
        createdAt: (toISOStringSafe(
          item.orderItem.order.created_at ?? new Date(),
        ) ?? "") satisfies string & tags.Format<"date-time">,
        updatedAt: (toISOStringSafe(
          item.orderItem.order.updated_at ?? new Date(),
        ) ?? "") satisfies string & tags.Format<"date-time">,
        deletedAt: (toISOStringSafe(
          item.orderItem.order.deleted_at ?? new Date(),
        ) ?? "") satisfies string & tags.Format<"date-time">,
        customer: {
          id: item.orderItem.order.customer.id,
          email: item.orderItem.order.customer.email,
          displayName: item.orderItem.order.customer.display_name ?? null,
          phoneNumber: item.orderItem.order.customer.phone_number ?? null,
          createdAt: (toISOStringSafe(
            item.orderItem.order.customer.created_at ?? new Date(),
          ) ?? "") satisfies string & tags.Format<"date-time">,
          updatedAt: (toISOStringSafe(
            item.orderItem.order.customer.updated_at ?? new Date(),
          ) ?? "") satisfies string & tags.Format<"date-time">,
        },
      },
      productVariant: {
        id: item.orderItem.productVariant.id,
        skuCode: item.orderItem.productVariant.sku_code,
        priceOverride: item.orderItem.productVariant.price_override ?? null,
        stockQuantity: item.orderItem.productVariant.stock_quantity,
        createdAt: (toISOStringSafe(
          item.orderItem.productVariant.created_at ?? new Date(),
        ) ?? "") satisfies string & tags.Format<"date-time">,
        updatedAt: (toISOStringSafe(
          item.orderItem.productVariant.updated_at ?? new Date(),
        ) ?? "") satisfies string & tags.Format<"date-time">,
        deletedAt: (toISOStringSafe(
          item.orderItem.productVariant.deleted_at ?? new Date(),
        ) ?? "") satisfies string & tags.Format<"date-time">,
      },
    },
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  } satisfies IPageIShoppingMallShipmentOrderItem.ISummary;
}
