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

export async function postEcommerceAdminOrdersOrderIdShipments(props: {
  admin: AdminPayload;
  orderId: string;
  body: IEcommerceShipment.ICreate;
}): Promise<IEcommerceShipment> {
  const order = await MyGlobal.prisma.ecommerce_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  const created = await MyGlobal.prisma.ecommerce_shipments.create({
    data: {
      id: v4(),
      carrier: props.body.carrier,
      tracking_number: props.body.tracking_number,
      shipping_date: props.body.shipping_date,
      status: props.body.status,
      order: { connect: { id: order.id } },
      estimated_delivery_date: null,
      actual_delivery_date: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  return await EcommerceShipmentTransformer.transform(created);
}
