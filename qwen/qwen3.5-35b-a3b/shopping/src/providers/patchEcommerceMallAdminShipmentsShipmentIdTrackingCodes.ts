import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentTrackingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingCode";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchEcommerceMallAdminShipmentsShipmentIdTrackingCodes(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipment.IUpdateTrackingCode;
}): Promise<IEcommerceMallShipment> {
  // Step 1: Verify shipment exists and is not deleted
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      },
      include: {
        trackingCodes: true,
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
        seller: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  // Step 2: Validate tracking codes array has at least 1 item
  if (props.body.tracking_codes.length < 1) {
    throw new HttpException("At least one tracking code is required", 400);
  }
  // Step 3: Validate tracking codes are unique within the shipment
  const trackingCodeSet = new Set<string>();
  for (const code of props.body.tracking_codes) {
    if (trackingCodeSet.has(code.trackingCode)) {
      throw new HttpException("Duplicate tracking code within shipment", 400);
    }
    trackingCodeSet.add(code.trackingCode);
  }
  // Step 4: Delete all existing tracking codes for this shipment
  await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.deleteMany({
    where: {
      shipment_id: shipment.id,
    },
  });
  // Step 5: Insert new tracking code records
  const trackingCodePromises = props.body.tracking_codes.map((code) =>
    MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shipment_id: shipment.id,
        carrier_name: code.carrierName,
        tracking_code: code.trackingCode,
        created_at: new Date(),
        updated_at: new Date(),
      },
    }),
  );
  await Promise.all(trackingCodePromises);
  // Step 6: Update shipment carrier information and timestamp
  const updatedShipment = await MyGlobal.prisma.ecommerce_mall_shipments.update(
    {
      where: { id: props.shipmentId },
      data: {
        ...(props.body.carrier_name !== undefined && {
          carrier_name: props.body.carrier_name,
        }),
        ...(props.body.carrier_phone !== undefined && {
          carrier_phone: props.body.carrier_phone,
        }),
        ...(props.body.carrier_website !== undefined && {
          carrier_website: props.body.carrier_website,
        }),
        updated_at: new Date(),
      },
      include: {
        trackingCodes: true,
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
        seller: {
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
  );
  // Step 7: Transform and return shipment
  return {
    id: updatedShipment.id as string & tags.Format<"uuid">,
    carrierName: updatedShipment.carrier_name ?? undefined,
    carrierPhone: updatedShipment.carrier_phone ?? undefined,
    carrierWebsite: updatedShipment.carrier_website ?? undefined,
    status: updatedShipment.status,
    shippedAt: updatedShipment.shipped_at
      ? toISOStringSafe(updatedShipment.shipped_at)
      : null,
    deliveredAt: updatedShipment.delivered_at
      ? toISOStringSafe(updatedShipment.delivered_at)
      : null,
    estimatedDeliveryAt: updatedShipment.estimated_delivery_at
      ? toISOStringSafe(updatedShipment.estimated_delivery_at)
      : null,
    deliveryAddress: updatedShipment.delivery_address ?? undefined,
    createdAt: toISOStringSafe(updatedShipment.created_at),
    updatedAt: toISOStringSafe(updatedShipment.updated_at),
    deletedAt: updatedShipment.deleted_at
      ? toISOStringSafe(updatedShipment.deleted_at)
      : null,
    order: {
      id: updatedShipment.order.id as string & tags.Format<"uuid">,
      order_number: updatedShipment.order.order_number,
      total_price: updatedShipment.order.total_price,
      status: updatedShipment.order.status,
      shipping_address: {
        id: updatedShipment.order.shippingAddress.id as string &
          tags.Format<"uuid">,
        recipient_name: updatedShipment.order.shippingAddress.recipient_name,
        recipient_phone: updatedShipment.order.shippingAddress.recipient_phone,
        street: updatedShipment.order.shippingAddress.street,
        city: updatedShipment.order.shippingAddress.city,
        state: updatedShipment.order.shippingAddress.state,
        is_default: updatedShipment.order.shippingAddress.is_default,
        created_at: toISOStringSafe(
          updatedShipment.order.shippingAddress.created_at,
        ),
        updated_at: toISOStringSafe(
          updatedShipment.order.shippingAddress.updated_at,
        ),
        deleted_at: updatedShipment.order.shippingAddress.deleted_at
          ? toISOStringSafe(updatedShipment.order.shippingAddress.deleted_at)
          : null,
      } satisfies IEcommerceMallAddress.ISummary,
      created_at: toISOStringSafe(updatedShipment.order.created_at),
      deleted_at: updatedShipment.order.deleted_at
        ? toISOStringSafe(updatedShipment.order.deleted_at)
        : null,
    } satisfies IEcommerceMallOrder.ISummary,
    seller: {
      id: updatedShipment.seller.id as string & tags.Format<"uuid">,
      email: updatedShipment.seller.email,
      createdAt: toISOStringSafe(updatedShipment.seller.created_at),
      updatedAt: toISOStringSafe(updatedShipment.seller.updated_at),
      deletedAt: updatedShipment.seller.deleted_at
        ? toISOStringSafe(updatedShipment.seller.deleted_at)
        : null,
      status: "pending" as const,
    } satisfies IEcommerceMallSeller.ISummary,
  };
}
