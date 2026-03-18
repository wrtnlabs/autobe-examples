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

export async function deleteShoppingMallMemberShipmentConfirmationId(props: {
  member: MemberPayload;
  shipmentConfirmationId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const memberSeller = await tx.shopping_mall_members.findFirst({
      where: {
        id: props.member.id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
    if (memberSeller === null || memberSeller.deleted_at !== null) {
      throw new HttpException("Forbidden", 403);
    }
    const confirmation =
      await tx.shopping_mall_shipment_confirmations.findFirstOrThrow({
        where: {
          shopping_mall_shipment_id: props.shipmentConfirmationId,
          deleted_at: null,
        } satisfies Prisma.shopping_mall_shipment_confirmationsFindFirstArgs,
        select: {
          shopping_mall_shipment_id: true,
          deleted_at: true,
          shipment: {
            select: {
              id: true,
              shopping_mall_order_id: true,
              seller_snapshot_id: true,
            },
          },
        },
      });
    await tx.shopping_mall_shipment_confirmations.delete({
      where: {
        shopping_mall_shipment_id: confirmation.shopping_mall_shipment_id,
      } satisfies Prisma.shopping_mall_shipment_confirmationsWhereUniqueInput,
    });
  });
}
