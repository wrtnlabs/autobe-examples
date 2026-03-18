import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminShipmentsShipmentId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  const nowShipment =
    await MyGlobal.prisma.shopping_mall_shipments.findFirstOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        seller_snapshot_id: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        orderItems: {
          select: {
            id: true,
            shopping_mall_order_id: true,
            shopping_mall_product_variant_id: true,
            seller_snapshot_id: true,
            shopping_mall_shipment_id: true,
            seller_price_at_purchase: true,
            quantity: true,
            line_item_status: true,
            placed_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            order: {
              select: {
                id: true,
              },
            },
            productVariant: {
              select: {
                id: true,
              },
            },
            sellerSnapshot: {
              select: {
                id: true,
              },
            },
            shipment: {
              select: {
                id: true,
              },
            },
            cancellationRequests: {
              select: {
                id: true,
              },
            },
            refundRequests: {
              select: {
                id: true,
              },
            },
            review: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  const latestConfirmation =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findFirst({
      where: {
        shopping_mall_shipment_id: props.shipmentId,
        deleted_at: null,
      },
      orderBy: { confirmed_at: "desc" },
      select: {
        confirmation_type: true,
        confirmed_at: true,
        tracking_url: true,
        tracking_number: true,
        carrier_name: true,
        note: true,
      },
    });
  return {
    id: nowShipment.id,
    order: await ShoppingMallOrderAtSummaryTransformer.transform(
      nowShipment.order,
    ),
    sellerSnapshotId: nowShipment.seller_snapshot_id,
    status: nowShipment.status,
    orderItems: await ArrayUtil.asyncMap(
      nowShipment.orderItems,
      ShoppingMallOrderItemAtSummaryTransformer.transform,
    ),
    tracking: latestConfirmation
      ? {
          confirmationType: null,
          confirmedAt: null,
          trackingUrl: null,
          trackingNumber: null,
          carrierName: null,
          note: null,
        }
      : null,
    createdAt: toISOStringSafe(nowShipment.created_at),
    updatedAt: toISOStringSafe(nowShipment.updated_at),
  };
}
