import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentTrackingUpdate";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipmentsShipmentIdTrackingUpdates(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentTrackingUpdate.IRequest;
}): Promise<IPageIEcommerceMallShipmentTrackingUpdate.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId },
  });
  const whereInput: Prisma.ecommerce_mall_shipment_tracking_updatesWhereInput =
    {
      shipment_id: props.shipmentId,
      tracking_status: props.body.tracking_status,
    };
  const data =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shipment: {
          select: {
            id: true,
            carrier_name: true,
            carrier_phone: true,
            carrier_website: true,
            status: true,
            shipped_at: true,
            delivered_at: true,
            estimated_delivery_at: true,
            order: {
              select: {
                id: true,
                order_number: true,
                total_price: true,
                status: true,
                shippingAddress: {
                  select: {
                    id: true,
                    recipient_name: true,
                    recipient_phone: true,
                    street: true,
                    city: true,
                    state: true,
                    is_default: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                created_at: true,
                deleted_at: true,
              },
            },
          },
        },
        tracking_status: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.count({
      where: whereInput,
    });
  const trackingCountByShipment =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.groupBy({
      by: ["shipment_id"],
      _count: {
        id: true,
      },
      where: whereInput,
    });
  const countMap = new Map(
    trackingCountByShipment.map((item) => [item.shipment_id, item._count.id]),
  );
  return {
    data: data.map((update) => {
      const trackingCount = countMap.get(update.shipment.id) ?? 0;
      return {
        id: update.id as string & tags.Format<"uuid">,
        shipment: {
          id: update.shipment.id as string & tags.Format<"uuid">,
          carrierName: update.shipment.carrier_name,
          carrierPhone: update.shipment.carrier_phone,
          carrierWebsite: update.shipment.carrier_website,
          status: update.shipment.status,
          shippedAt: update.shipment.shipped_at
            ? toISOStringSafe(update.shipment.shipped_at)
            : null,
          deliveredAt: update.shipment.delivered_at
            ? toISOStringSafe(update.shipment.delivered_at)
            : null,
          estimatedDeliveryAt: update.shipment.estimated_delivery_at
            ? toISOStringSafe(update.shipment.estimated_delivery_at)
            : null,
          order: {
            id: update.shipment.order.id as string & tags.Format<"uuid">,
            order_number: update.shipment.order.order_number,
            total_price: update.shipment.order.total_price,
            status: update.shipment.order.status,
            shipping_address: {
              id: update.shipment.order.shippingAddress.id as string &
                tags.Format<"uuid">,
              recipient_name:
                update.shipment.order.shippingAddress.recipient_name,
              recipient_phone:
                update.shipment.order.shippingAddress.recipient_phone,
              street: update.shipment.order.shippingAddress.street,
              city: update.shipment.order.shippingAddress.city,
              state: update.shipment.order.shippingAddress.state,
              is_default: update.shipment.order.shippingAddress.is_default,
              created_at: toISOStringSafe(
                update.shipment.order.shippingAddress.created_at,
              ),
              updated_at: toISOStringSafe(
                update.shipment.order.shippingAddress.updated_at,
              ),
              deleted_at: update.shipment.order.shippingAddress.deleted_at
                ? toISOStringSafe(
                    update.shipment.order.shippingAddress.deleted_at,
                  )
                : null,
            },
            created_at: toISOStringSafe(update.shipment.order.created_at),
            deleted_at: update.shipment.order.deleted_at
              ? toISOStringSafe(update.shipment.order.deleted_at)
              : null,
          },
          trackingCount: trackingCount,
        } as IEcommerceMallShipment.ISummary,
        tracking_status: update.tracking_status,
        created_at: toISOStringSafe(update.created_at),
      } as IEcommerceMallShipmentTrackingUpdate.ISummary;
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
