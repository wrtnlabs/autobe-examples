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
  const now: string & tags.Format<"date-time"> = "2026-03-31T03:53:50.519Z";
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_customer_id: true,
      deleted_at: true,
      orderItems: {
        select: {
          deleted_at: true,
          shopping_mall_shipment_id: true,
          line_item_status: true,
        },
      },
    },
  });
  if (order.deleted_at !== null) {
    // Soft-deleted orders are treated as not found for normal views.
    throw new HttpException("Not Found", 404);
  }
  if (order.shopping_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const locked = order.orderItems.some(
    (item) =>
      item.deleted_at === null &&
      (item.shopping_mall_shipment_id !== null ||
        item.line_item_status !== "created"),
  );
  if (locked) {
    throw new HttpException(
      "Order header cannot be updated in its current fulfillment state",
      409,
    );
  }
  const data: Prisma.shopping_mall_ordersUpdateInput = {
    updated_at: now,
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
  };
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data,
    });
  });
  const updated = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    ...ShoppingMallOrderTransformer.select(),
  });
  return await ShoppingMallOrderTransformer.transform(updated);
}
