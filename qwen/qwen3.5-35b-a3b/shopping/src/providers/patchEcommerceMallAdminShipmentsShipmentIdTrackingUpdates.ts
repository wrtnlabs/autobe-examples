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
  // Verify shipment exists and is not soft deleted
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Build query filters from request body
  const whereInput: Prisma.ecommerce_mall_shipment_tracking_updatesWhereInput =
    {
      shipment_id: props.shipmentId,
      deleted_at: null,
      ...(props.body.tracking_status !== undefined && {
        tracking_status: props.body.tracking_status,
      }),
    } satisfies Prisma.ecommerce_mall_shipment_tracking_updatesWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query tracking updates
  const data =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
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
                shipping_address_id: true,
                created_at: true,
                deleted_at: true,
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
              },
            },
          },
        },
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_shipment_tracking_updates.count({
      where: whereInput,
    });
  // Transform results
  const transformedData: IEcommerceMallShipmentTrackingUpdate.ISummary[] =
    await ArrayUtil.asyncMap(data, async (update) => {
      const shipmentData = update.shipment;
      const orderData = shipmentData.order;
      const addressData = orderData.shippingAddress;
      const shipment: IEcommerceMallShipment.ISummary = {
        id: shipmentData.id as string & tags.Format<"uuid">,
        carrierName: shipmentData.carrier_name ?? undefined,
        carrierPhone: shipmentData.carrier_phone ?? undefined,
        carrierWebsite: shipmentData.carrier_website ?? undefined,
        status: shipmentData.status,
        shippedAt: shipmentData.shipped_at
          ? toISOStringSafe(shipmentData.shipped_at)
          : undefined,
        deliveredAt: shipmentData.delivered_at
          ? toISOStringSafe(shipmentData.delivered_at)
          : undefined,
        estimatedDeliveryAt: shipmentData.estimated_delivery_at
          ? toISOStringSafe(shipmentData.estimated_delivery_at)
          : undefined,
        order: {
          id: orderData.id as string & tags.Format<"uuid">,
          order_number: orderData.order_number,
          total_price: orderData.total_price,
          status: orderData.status,
          shipping_address: {
            id: addressData.id as string & tags.Format<"uuid">,
            recipient_name: addressData.recipient_name,
            recipient_phone: addressData.recipient_phone,
            street: addressData.street,
            city: addressData.city,
            state: addressData.state,
            is_default: addressData.is_default,
            created_at: toISOStringSafe(addressData.created_at),
            updated_at: toISOStringSafe(addressData.updated_at),
            deleted_at: addressData.deleted_at
              ? toISOStringSafe(addressData.deleted_at)
              : null,
          },
          created_at: toISOStringSafe(orderData.created_at),
          deleted_at: orderData.deleted_at
            ? toISOStringSafe(orderData.deleted_at)
            : null,
        },
        trackingCount: data.length,
      };
      return {
        id: update.id as string & tags.Format<"uuid">,
        shipment: shipment,
        tracking_status: update.tracking_status,
        created_at: toISOStringSafe(update.created_at),
      };
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
