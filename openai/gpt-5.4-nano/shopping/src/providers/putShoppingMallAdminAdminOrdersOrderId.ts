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
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  const updateData = {
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
  } satisfies Prisma.shopping_mall_ordersUpdateInput;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: updateData,
    });
  });
  const updated = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    ...ShoppingMallOrderTransformer.select(),
  });
  return await ShoppingMallOrderTransformer.transform(updated);
}
