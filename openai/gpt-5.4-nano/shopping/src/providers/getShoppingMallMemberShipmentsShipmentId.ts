import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberShipmentsShipmentId(props: {
  member: MemberPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        seller_snapshot_id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_order: {
          select: {
            id: true,
            order_code: true,
            placed_at: true,
            deleted_at: true,
            shopping_mall_member_id: true,
          },
        },
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        orderItems: ShoppingMallOrderItemAtSummaryTransformer.select(),
        shipmentConfirmation: {
          select: {
            confirmation_type: true,
            confirmed_at: true,
            tracking_url: true,
            tracking_number: true,
            carrier_name: true,
            note: true,
            deleted_at: true,
          },
        },
      } as unknown as Prisma.shopping_mall_shipmentsFindUniqueArgs["select"],
    });
  if (shipment.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // assuming order.customer/owner field name shopping_mall_member_id in order select
  const orderOwnerMemberId = (shipment as any).shopping_mall_order
    .shopping_mall_member_id;
  if (orderOwnerMemberId !== props.member.id) {
    throw new HttpException("Not Found", 404);
  }
  return await ShoppingMallShipmentTransformer.transform({
    ...shipment,
    order: (shipment as any).order,
    orderItems: (shipment as any).orderItems,
  } as any);
}
