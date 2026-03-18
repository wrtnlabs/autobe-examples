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

export async function putShoppingMallMemberShipmentsShipmentId(props: {
  member: MemberPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const { member, shipmentId, body } = props;
  const prisma = MyGlobal.prisma as unknown as {
    shopping_mall_shipments: {
      findUnique: (args: {
        where: {
          id: typeof shipmentId;
        };
      }) => Promise<unknown | null>;
      update: (args: {
        where: {
          id: typeof shipmentId;
        };
        data: unknown;
      }) => Promise<unknown>;
    };
  };
  const shipment = await prisma.shopping_mall_shipments.findUnique({
    where: { id: shipmentId },
  });
  if (shipment === null) {
    throw new HttpException("Shopping mall shipment is not found", 404);
  }
  const shipmentAny = shipment as unknown as Record<string, unknown>;
  const memberIdInShipment = shipmentAny["member_id"];
  const memberIdInPayload = (member as unknown as Record<string, unknown>)[
    "member_id"
  ];
  if (
    memberIdInShipment !== memberIdInPayload ||
    memberIdInShipment === undefined ||
    memberIdInPayload === undefined
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const bodyAny = body as unknown as Record<string, unknown>;
  const startRaw = bodyAny["start_date"];
  const endRaw = bodyAny["end_date"];
  const updateData: Record<string, unknown> = {
    ...bodyAny,
  };
  if (startRaw instanceof Date) {
    updateData["start_date"] = toISOStringSafe(startRaw) as unknown;
  }
  if (endRaw instanceof Date) {
    updateData["end_date"] = toISOStringSafe(endRaw) as unknown;
  }
  const updated = await prisma.shopping_mall_shipments.update({
    where: { id: shipmentId },
    data: updateData,
  });
  // Convert any Date fields returned by Prisma
  const updatedAny = updated as unknown as Record<string, unknown>;
  if (updatedAny["start_date"] instanceof Date) {
    updatedAny["start_date"] = toISOStringSafe(
      updatedAny["start_date"] as Date,
    );
  }
  if (updatedAny["end_date"] instanceof Date) {
    updatedAny["end_date"] = toISOStringSafe(updatedAny["end_date"] as Date);
  }
  return updatedAny as unknown as IShoppingMallShipment;
}
