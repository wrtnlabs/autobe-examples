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

export async function deleteShoppingMallMemberShipmentConfirmationsShipmentConfirmationId(props: {
  member: MemberPayload;
  shipmentConfirmationId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const confirmation =
      await tx.shopping_mall_shipment_confirmations.findUniqueOrThrow({
        where: { id: props.shipmentConfirmationId },
        select: {
          id: true,
          shopping_mall_shipment_id: true,
        },
      });
    const shipment = await tx.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: confirmation.shopping_mall_shipment_id },
      select: {
        id: true,
        seller_snapshot_id: true,
      },
    });
    const snapshot = await tx.shopping_mall_snapshots.findUniqueOrThrow({
      where: { id: shipment.seller_snapshot_id },
      select: {
        id: true,
        source_seller_id: true,
      },
    });
    if (snapshot.source_seller_id === null) {
      throw new HttpException("Forbidden", 403);
    }
    if (snapshot.source_seller_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    await tx.shopping_mall_shipment_confirmations.delete({
      where: { id: confirmation.id },
    });
  });
}
