import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipment.IUpdate;
}): Promise<IMallPlatformShipment> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        carrier_name: true,
        tracking_number: true,
        tracking_url: true,
        updated_at: true,
      },
    });
  if (shipment.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    shipment.status === "delivered" ||
    shipment.status === "completed" ||
    shipment.status === "complete" ||
    shipment.status === "cancelled" ||
    shipment.status === "canceled"
  ) {
    throw new HttpException("Shipment is unavailable for update", 409);
  }
  const nextStatus = props.body.status ?? shipment.status;
  const shipTimestamp =
    nextStatus === "shipped" && shipment.shipped_at === null
      ? new Date()
      : shipment.shipped_at;
  const deliverTimestamp =
    nextStatus === "delivered" && shipment.delivered_at === null
      ? new Date()
      : shipment.delivered_at;
  try {
    await MyGlobal.prisma.$transaction(async (prisma) => {
      await prisma.mall_platform_shipments.update({
        where: { id: props.shipmentId },
        data: {
          ...(props.body.carrierName !== undefined
            ? { carrier_name: props.body.carrierName }
            : {}),
          ...(props.body.trackingNumber !== undefined
            ? { tracking_number: props.body.trackingNumber }
            : {}),
          ...(props.body.trackingUrl !== undefined
            ? { tracking_url: props.body.trackingUrl }
            : {}),
          ...(props.body.status !== undefined
            ? { status: props.body.status }
            : {}),
          ...(nextStatus === "shipped" && shipment.shipped_at === null
            ? { shipped_at: shipTimestamp }
            : {}),
          ...(nextStatus === "delivered" && shipment.delivered_at === null
            ? { delivered_at: deliverTimestamp }
            : {}),
          updated_at: new Date(),
        },
      });
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (
        error as {
          code?: string;
        }
      ).code === "P2002"
    ) {
      throw new HttpException("Duplicate tracking number", 409);
    }
    throw error;
  }
  const updated =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...MallPlatformShipmentTransformer.select(),
    });
  return await MallPlatformShipmentTransformer.transform(updated);
}
