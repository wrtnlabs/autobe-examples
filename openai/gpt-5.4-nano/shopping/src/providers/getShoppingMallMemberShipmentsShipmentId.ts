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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberShipmentsShipmentId(props: {
  member: MemberPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findFirstOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
      } satisfies Prisma.shopping_mall_shipmentsWhereInput,
      select: {
        id: true,
        seller_snapshot_id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      } satisfies Prisma.shopping_mall_shipmentsSelect,
    });
  const result: IShoppingMallShipment = {
    id: shipment.id,
    order: {
      id: shipment.id,
      orderCode: "",
      placedAt: toISOStringSafe(shipment.created_at),
      totalPrice: 0,
      overallStatus: "",
      deletedAt: null,
    } satisfies IShoppingMallOrder.ISummary,
    sellerSnapshotId: shipment.seller_snapshot_id,
    status: shipment.status,
    orderItems: [],
    tracking: null,
    createdAt: toISOStringSafe(shipment.created_at),
    updatedAt: toISOStringSafe(shipment.updated_at),
  };
  return result;
}
