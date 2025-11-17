import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShipments(props: {
  customer: CustomerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_shipments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shipping_carrier: props.body.shipping_carrier,
      tracking_number: props.body.tracking_number,
      shipment_status: "pending",
      shipped_at: props.body.shipped_at ?? null,
      delivered_at: props.body.delivered_at ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shipping_carrier: created.shipping_carrier,
    tracking_number: created.tracking_number,
    status: typia.assert<
      "pending" | "shipped" | "in_transit" | "delivered" | "cancelled"
    >(created.shipment_status),
    shipped_at: created.shipped_at ? toISOStringSafe(created.shipped_at) : null,
    delivered_at: created.delivered_at
      ? toISOStringSafe(created.delivered_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
