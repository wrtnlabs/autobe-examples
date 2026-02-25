import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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

export async function patchShoppingMallSellerShipmentItems(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentItem.IRequest;
}): Promise<IPageIShoppingMallShipmentItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_shipment_itemsWhereInput = {
    shipment: {
      seller_id: props.seller.id,
      deleted_at: null,
      ...(props.body.status ? { status: props.body.status } : {}),
    },
  };
  if (props.body.shipmentId) where.shipment_id = props.body.shipmentId;
  if (props.body.orderItemId) where.order_item_id = props.body.orderItemId;
  if (props.body.createdAtFrom || props.body.createdAtTo) {
    where.created_at = {};
    if (props.body.createdAtFrom)
      where.created_at.gte = new Date(props.body.createdAtFrom);
    if (props.body.createdAtTo)
      where.created_at.lte = new Date(props.body.createdAtTo);
  }
  if (props.body.updatedAtFrom || props.body.updatedAtTo) {
    where.updated_at = {};
    if (props.body.updatedAtFrom)
      where.updated_at.gte = new Date(props.body.updatedAtFrom);
    if (props.body.updatedAtTo)
      where.updated_at.lte = new Date(props.body.updatedAtTo);
  }
  const include = {
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
  } satisfies Prisma.shopping_mall_shipment_itemsInclude;
  const total = await MyGlobal.prisma.shopping_mall_shipment_items.count({
    where,
  });
  const records = await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include,
  });
  function toSummary(
    record: (typeof records)[number],
  ): IShoppingMallShipmentItem.ISummary {
    return {
      id: record.id,
      shipment_id: record.shipment_id,
      order_item_id: record.order_item_id,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
      shipment: {
        id: record.shipment.id,
        status: record.shipment.status,
        createdAt: toISOStringSafe(record.shipment.created_at),
        updatedAt: toISOStringSafe(record.shipment.updated_at),
        deletedAt: record.shipment.deleted_at
          ? toISOStringSafe(record.shipment.deleted_at)
          : null,
        seller: {
          id: record.shipment.seller.id,
          email: record.shipment.seller.email,
          shopName: record.shipment.seller.shop_name,
          shopDescription: record.shipment.seller.shop_description ?? null,
          logoUri: record.shipment.seller.logo_uri ?? null,
          approvalStatus: record.shipment.seller.approval_status,
          rejectionReason: record.shipment.seller.rejection_reason ?? null,
        },
      },
      orderItem: {
        id: record.orderItem.id,
        quantity: record.orderItem.quantity,
        status: typia.assert<
          "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
        >(record.orderItem.status),
        createdAt: toISOStringSafe(record.orderItem.created_at),
        updatedAt: toISOStringSafe(record.orderItem.updated_at),
        deletedAt: record.orderItem.deleted_at
          ? toISOStringSafe(record.orderItem.deleted_at)
          : null,
        order: {
          id: record.orderItem.order.id,
          orderNumber: record.orderItem.order.order_number,
          totalPrice: record.orderItem.order.total_price,
          totalQuantity: record.orderItem.order.total_quantity,
          orderStatus: typia.assert<
            "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
          >(record.orderItem.order.order_status),
          createdAt: toISOStringSafe(record.orderItem.order.created_at),
          updatedAt: toISOStringSafe(record.orderItem.order.updated_at),
          deletedAt: record.orderItem.order.deleted_at
            ? toISOStringSafe(record.orderItem.order.deleted_at)
            : null,
          customer: {
            id: record.orderItem.order.customer.id,
            email: record.orderItem.order.customer.email,
            displayName: record.orderItem.order.customer.display_name ?? null,
            phoneNumber: record.orderItem.order.customer.phone_number ?? null,
            createdAt: toISOStringSafe(
              record.orderItem.order.customer.created_at,
            ),
            updatedAt: toISOStringSafe(
              record.orderItem.order.customer.updated_at,
            ),
          },
        },
        productVariant: {
          id: record.orderItem.productVariant.id,
          skuCode: record.orderItem.productVariant.sku_code,
          priceOverride: record.orderItem.productVariant.price_override ?? null,
          stockQuantity: record.orderItem.productVariant.stock_quantity,
          createdAt: toISOStringSafe(
            record.orderItem.productVariant.created_at,
          ),
          updatedAt: toISOStringSafe(
            record.orderItem.productVariant.updated_at,
          ),
          deletedAt: record.orderItem.productVariant.deleted_at
            ? toISOStringSafe(record.orderItem.productVariant.deleted_at)
            : null,
        },
      },
    };
  }
  return {
    data: records.map(toSummary),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
