import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  if (props.admin.type !== "admin") throw new HttpException("Forbidden", 403);
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      deleted_at: true,
      order_code: true,
      ship_to_name: true,
      ship_to_phone: true,
      ship_to_postal_code: true,
      ship_to_region: true,
      ship_to_city: true,
      ship_to_street_address: true,
      ship_to_detail_address: true,
      shipping_instructions: true,
      placed_at: true,
      orderItems: { select: { line_item_status: true } },
    },
  });
  // eligibility: no line item status should be 'shipped' or later
  const locked = order.orderItems.some(
    (i) =>
      i.line_item_status === "shipped" ||
      i.line_item_status === "delivered" ||
      i.line_item_status === "cancelled" ||
      i.line_item_status === "refunded",
  );
  if (locked) throw new HttpException("Order shipping is locked", 400);
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      ...(props.body.ship_to_name !== undefined && {
        ship_to_name: props.body.ship_to_name,
      }),
      ...(props.body.ship_to_phone !== undefined && {
        ship_to_phone: props.body.ship_to_phone,
      }),
      ...(props.body.ship_to_postal_code !== undefined && {
        ship_to_postal_code: props.body.ship_to_postal_code,
      }),
      ...(props.body.ship_to_region !== undefined && {
        ship_to_region: props.body.ship_to_region,
      }),
      ...(props.body.ship_to_city !== undefined && {
        ship_to_city: props.body.ship_to_city,
      }),
      ...(props.body.ship_to_street_address !== undefined && {
        ship_to_street_address: props.body.ship_to_street_address,
      }),
      ...(props.body.ship_to_detail_address !== undefined && {
        ship_to_detail_address: props.body.ship_to_detail_address,
      }),
      ...(props.body.shipping_instructions !== undefined && {
        shipping_instructions: props.body.shipping_instructions,
      }),
    },
  });
  const updated = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    ...ShoppingMallOrderTransformer.select(),
  });
  return await ShoppingMallOrderTransformer.transform(updated);
}
