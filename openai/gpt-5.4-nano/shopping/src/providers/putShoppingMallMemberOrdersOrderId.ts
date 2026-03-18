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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberOrdersOrderId(props: {
  member: MemberPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_customer_id: true,
      deleted_at: true,
      placed_at: true,
      updated_at: true,
      ship_to_name: true,
      ship_to_phone: true,
      ship_to_postal_code: true,
      ship_to_region: true,
      ship_to_city: true,
      ship_to_street_address: true,
      ship_to_detail_address: true,
      shipping_instructions: true,
      orderItems: {
        select: {
          id: true,
          line_item_status: true,
          shopping_mall_shipment_id: true,
        },
      },
      shipments: {
        select: { id: true, status: true },
      },
    },
  });
  if (order.deleted_at !== null) {
    // Soft deleted should be treated as not found
    throw new HttpException("Not Found", 404);
  }
  if (order.shopping_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Conservative fulfillment progression check
  const hasAnyShipment = order.shipments.length > 0;
  const nonCreatedItems = order.orderItems.some(
    (it) => it.line_item_status !== "created",
  );
  if (hasAnyShipment || nonCreatedItems) {
    throw new HttpException("Order header updates are no longer allowed", 400);
  }
  const data = {
    ...(props.body.ship_to_name !== undefined
      ? { ship_to_name: props.body.ship_to_name }
      : {}),
    ...(props.body.ship_to_phone !== undefined
      ? { ship_to_phone: props.body.ship_to_phone }
      : {}),
    ...(props.body.ship_to_postal_code !== undefined
      ? { ship_to_postal_code: props.body.ship_to_postal_code }
      : {}),
    ...(props.body.ship_to_region !== undefined
      ? { ship_to_region: props.body.ship_to_region }
      : {}),
    ...(props.body.ship_to_city !== undefined
      ? { ship_to_city: props.body.ship_to_city }
      : {}),
    ...(props.body.ship_to_street_address !== undefined
      ? { ship_to_street_address: props.body.ship_to_street_address }
      : {}),
    ...(props.body.ship_to_detail_address !== undefined
      ? { ship_to_detail_address: props.body.ship_to_detail_address }
      : {}),
    ...(props.body.shipping_instructions !== undefined
      ? { shipping_instructions: props.body.shipping_instructions }
      : {}),
  };
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });
  });
  const updated = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    ...ShoppingMallOrderTransformer.select(),
  });
  return await ShoppingMallOrderTransformer.transform(updated);
}
