import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallMemberShipmentsShipmentId(props: {
  member: MemberPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: {
      id: props.shipmentId,
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
      seller_snapshot_id: true,
      deleted_at: true,
      order: {
        select: {
          shopping_customer_id: true,
        },
      },
    },
  });
  if (shipment === null || shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.order.shopping_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    try {
      await tx.shopping_mall_shipments.delete({
        where: {
          id: props.shipmentId,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (
        message.includes("does not exist") ||
        message.includes("Record to delete does not exist") ||
        message.includes("P2025")
      ) {
        throw new HttpException("Shipment not found", 404);
      }
      throw new HttpException("Failed to delete shipment", 500);
    }
  });
}
