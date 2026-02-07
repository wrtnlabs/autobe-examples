import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceShipmentTransformer } from "../transformers/EcommerceShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdminOrdersOrderIdShipmentsId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IEcommerceShipment.IUpdate;
}): Promise<IEcommerceShipment> {
  const shipment = await MyGlobal.prisma.ecommerce_shipments.findUnique({
    where: { id: props.id },
    select: { ecommerce_order_id: true },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);
  if (shipment.ecommerce_order_id !== props.orderId)
    throw new HttpException(
      "Shipment does not belong to the specified order",
      404,
    );
  // Validate carrier
  if (
    props.body.carrier &&
    !["FedEx", "DHL", "USPS"].includes(props.body.carrier)
  ) {
    throw new HttpException(
      "Invalid carrier. Allowed values: FedEx, DHL, USPS",
      400,
    );
  }
  // Validate tracking number uniqueness
  if (props.body.tracking_number) {
    const existing = await MyGlobal.prisma.ecommerce_shipments.findFirst({
      where: {
        tracking_number: props.body.tracking_number,
        id: { not: props.id },
      },
    });
    if (existing)
      throw new HttpException("Tracking number must be unique", 400);
  }
  // Validate status transitions
  if (props.body.status) {
    const currentStatus = await MyGlobal.prisma.ecommerce_shipments.findUnique({
      where: { id: props.id },
      select: { status: true },
    });
    if (
      currentStatus &&
      currentStatus.status === "delivered" &&
      props.body.status !== "delivered"
    ) {
      throw new HttpException(
        "Cannot revert status from delivered to previous states",
        400,
      );
    }
  }
  // Update shipment
  const updated = await MyGlobal.prisma.ecommerce_shipments.update({
    where: { id: props.id },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
      ...(props.body.status === "delivered" && {
        actual_delivery_date: toISOStringSafe(new Date()),
      }),
    },
    ...EcommerceShipmentTransformer.select(),
  });
  return await EcommerceShipmentTransformer.transform(updated);
}
