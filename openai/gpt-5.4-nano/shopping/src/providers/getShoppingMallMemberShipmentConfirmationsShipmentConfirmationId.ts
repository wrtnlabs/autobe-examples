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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberShipmentConfirmationsShipmentConfirmationId(props: {
  member: MemberPayload;
  shipmentConfirmationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentConfirmation> {
  const confirmation =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findFirstOrThrow(
      {
        where: {
          id: props.shipmentConfirmationId,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_shipment_id: true,
          confirmation_type: true,
          confirmed_at: true,
          tracking_url: true,
          tracking_number: true,
          carrier_name: true,
          note: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: confirmation.shopping_mall_shipment_id,
      deleted_at: null,
      order: {
        shopping_customer_id: props.member.id,
      },
    },
    select: { id: true },
  });
  if (shipment === null) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: confirmation.id,
    shopping_mall_shipment_id: confirmation.shopping_mall_shipment_id,
    confirmation_type: confirmation.confirmation_type,
    confirmed_at: confirmation.confirmed_at.toISOString() as string &
      tags.Format<"date-time">,
    tracking_url: confirmation.tracking_url ?? null,
    tracking_number: confirmation.tracking_number ?? null,
    carrier_name: confirmation.carrier_name ?? null,
    note: confirmation.note ?? null,
    created_at: confirmation.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: confirmation.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: confirmation.deleted_at?.toISOString() ?? null,
  };
}
