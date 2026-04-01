import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallShipmentConfirmationTransformer } from "../transformers/ShoppingMallShipmentConfirmationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberShipmentConfirmationsShipmentConfirmationId(props: {
  member: MemberPayload;
  shipmentConfirmationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentConfirmation> {
  const confirmation =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findUniqueOrThrow(
      {
        where: { id: props.shipmentConfirmationId, deleted_at: null },
        ...ShoppingMallShipmentConfirmationTransformer.select(),
      },
    );
  const shipmentId = confirmation.shopping_mall_shipment_id;
  // Authorization: member can view if they own at least one order item inside that shipment.
  const owningOrderIds = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      deleted_at: null,
      shopping_customer_id: props.member.id,
    },
    select: { id: true },
  });
  const owningOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        deleted_at: null,
        shopping_mall_shipment_id: shipmentId,
        shopping_mall_order_id: { in: owningOrderIds.map((o) => o.id) },
      },
      select: { id: true },
    });
  if (owningOrderItem === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallShipmentConfirmationTransformer.transform(
    confirmation,
  );
}
