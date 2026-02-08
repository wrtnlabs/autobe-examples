import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdministratorSellerSuspensionsSuspensionId(props: {
  administrator: AdministratorPayload;
  suspensionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const suspension =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.findUnique({
      where: { id: props.suspensionId },
      select: { id: true },
    });
  if (suspension === null) {
    throw new HttpException("Suspension not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_seller_suspensions.delete({
    where: { id: props.suspensionId },
  });
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_administrative_audit_logs.create({
    data: {
      id: v4(),
      administrator_id: props.administrator.id,
      action_type: "delete",
      target_entity: "shopping_mall_seller_suspensions",
      target_id: props.suspensionId,
      action_description: `Deleted seller suspension record with id ${props.suspensionId}`,
      action_data: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
