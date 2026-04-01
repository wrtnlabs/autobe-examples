import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipmentItem";
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

export async function patchMallPlatformCustomerShipmentsShipmentIdItems(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipmentItem.IRequest;
}): Promise<IPageIMallPlatformShipmentItem.ISummary> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        mall_platform_order_id: true,
      },
    });
  const order = await MyGlobal.prisma.mall_platform_orders.findUniqueOrThrow({
    where: { id: shipment.mall_platform_order_id },
    select: {
      customer_id: true,
    },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    mall_platform_shipment_id: props.shipmentId,
    deleted_at: null,
    ...(props.body.search === undefined || props.body.search === ""
      ? {}
      : {
          OR: [
            {
              orderItem: {
                status: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }),
  } satisfies Prisma.mall_platform_shipment_itemsWhereInput;
  const orderBy = (
    props.body.sort === "updatedAt"
      ? { updated_at: "desc" as const }
      : props.body.sort === "createdAt"
        ? { created_at: "asc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.mall_platform_shipment_itemsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.mall_platform_shipment_items.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      shipment: {
        select: {
          id: true,
          carrier_name: true,
          tracking_number: true,
          tracking_url: true,
          status: true,
          shipped_at: true,
          delivered_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          seller: {
            select: {
              id: true,
              email: true,
              status: true,
              rejection_reason: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          order: {
            select: {
              id: true,
              order_number: true,
              status: true,
              total_amount: true,
              created_at: true,
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
              status: true,
              total_amount: true,
              created_at: true,
            },
          },
          productVariant: {
            select: {
              id: true,
              sku_code: true,
              option_values: true,
              price_override: true,
              is_active: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  base_price: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              status: true,
              rejection_reason: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.mall_platform_shipment_items.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(data, async (item) => ({
      id: item.id,
      shipment: {
        id: item.shipment.id,
        seller: {
          id: item.shipment.seller.id,
          email: item.shipment.seller.email,
          status: item.shipment.seller.status,
          rejectionReason: item.shipment.seller.rejection_reason,
          createdAt: toISOStringSafe(item.shipment.seller.created_at),
          updatedAt: toISOStringSafe(item.shipment.seller.updated_at),
          deletedAt:
            item.shipment.seller.deleted_at === null
              ? null
              : toISOStringSafe(item.shipment.seller.deleted_at),
        },
        order: {
          id: item.shipment.order.id,
          orderNumber: item.shipment.order.order_number,
          status: item.shipment.order.status,
          totalAmount: item.shipment.order.total_amount,
          createdAt: toISOStringSafe(item.shipment.order.created_at),
        },
        carrierName: item.shipment.carrier_name,
        trackingNumber: item.shipment.tracking_number,
        trackingUrl: item.shipment.tracking_url,
        status: item.shipment.status,
        shippedAt:
          item.shipment.shipped_at === null
            ? null
            : toISOStringSafe(item.shipment.shipped_at),
        deliveredAt:
          item.shipment.delivered_at === null
            ? null
            : toISOStringSafe(item.shipment.delivered_at),
        createdAt: toISOStringSafe(item.shipment.created_at),
        updatedAt: toISOStringSafe(item.shipment.updated_at),
        deletedAt:
          item.shipment.deleted_at === null
            ? null
            : toISOStringSafe(item.shipment.deleted_at),
      },
      orderItem: {
        id: item.orderItem.id,
        quantity: item.orderItem.quantity,
        status: item.orderItem.status,
        order: {
          id: item.orderItem.order.id,
          orderNumber: item.orderItem.order.order_number,
          status: item.orderItem.order.status,
          totalAmount: item.orderItem.order.total_amount,
          createdAt: toISOStringSafe(item.orderItem.order.created_at),
        },
        productVariant: {
          id: item.orderItem.productVariant.id,
          skuCode: item.orderItem.productVariant.sku_code,
          optionValues: item.orderItem.productVariant.option_values,
          priceOverride: item.orderItem.productVariant.price_override,
          isActive: item.orderItem.productVariant.is_active,
          product: {
            id: item.orderItem.productVariant.product.id,
            name: item.orderItem.productVariant.product.name,
            description: item.orderItem.productVariant.product.description,
            basePrice: item.orderItem.productVariant.product.base_price,
            sellerAccount: {
              id: item.shipment.seller.id,
              email: item.shipment.seller.email,
              approvalStatus: item.shipment.seller.status,
              rejectionReason: item.shipment.seller.rejection_reason,
              suspendedAt: null,
              deletedAt:
                item.shipment.seller.deleted_at === null
                  ? null
                  : toISOStringSafe(item.shipment.seller.deleted_at),
              createdAt: toISOStringSafe(item.shipment.seller.created_at),
              updatedAt: toISOStringSafe(item.shipment.seller.updated_at),
            },
            category: null,
            createdAt: toISOStringSafe(
              item.orderItem.productVariant.product.created_at,
            ),
            updatedAt: toISOStringSafe(
              item.orderItem.productVariant.product.updated_at,
            ),
            deletedAt:
              item.orderItem.productVariant.product.deleted_at === null
                ? null
                : toISOStringSafe(
                    item.orderItem.productVariant.product.deleted_at,
                  ),
          },
          createdAt: toISOStringSafe(item.orderItem.productVariant.created_at),
          updatedAt: toISOStringSafe(item.orderItem.productVariant.updated_at),
          deletedAt:
            item.orderItem.productVariant.deleted_at === null
              ? null
              : toISOStringSafe(item.orderItem.productVariant.deleted_at),
        },
        seller: {
          id: item.orderItem.seller.id,
          email: item.orderItem.seller.email,
          status: item.orderItem.seller.status,
          rejectionReason: item.orderItem.seller.rejection_reason,
          createdAt: toISOStringSafe(item.orderItem.seller.created_at),
          updatedAt: toISOStringSafe(item.orderItem.seller.updated_at),
          deletedAt:
            item.orderItem.seller.deleted_at === null
              ? null
              : toISOStringSafe(item.orderItem.seller.deleted_at),
        },
        createdAt: toISOStringSafe(item.orderItem.created_at),
        updatedAt: toISOStringSafe(item.orderItem.updated_at),
        deletedAt:
          item.orderItem.deleted_at === null
            ? null
            : toISOStringSafe(item.orderItem.deleted_at),
        created_at: toISOStringSafe(item.orderItem.created_at),
        updated_at: toISOStringSafe(item.orderItem.updated_at),
        deleted_at:
          item.orderItem.deleted_at === null
            ? null
            : toISOStringSafe(item.orderItem.deleted_at),
      },
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
    })),
  };
}
