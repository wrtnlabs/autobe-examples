import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentCollector } from "../collectors/ShoppingMallShipmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberShipments(props: {
  member: MemberPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // 1) Order must exist
    await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_order_id },
      select: { id: true, deleted_at: true },
    });
    // 2) Create shipment via collector (validates seller_snapshot_id consistency)
    const created = await tx.shopping_mall_shipments.create({
      data: await ShoppingMallShipmentCollector.collect({
        body: props.body,
      }),
      ...ShoppingMallShipmentTransformer.select(),
    });
    // 3) Update included order items to reference the shipment
    await tx.shopping_mall_order_items.updateMany({
      where: {
        id: { in: props.body.shopping_mall_order_item_ids },
      },
      data: {
        shopping_mall_shipment_id: created.id,
        updated_at: new Date(),
      },
    });
    // 4) Return fully transformed shipment
    const reloaded = await tx.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: created.id },
      ...ShoppingMallShipmentTransformer.select(),
    });
    return await ShoppingMallShipmentTransformer.transform(reloaded);
  });
}
