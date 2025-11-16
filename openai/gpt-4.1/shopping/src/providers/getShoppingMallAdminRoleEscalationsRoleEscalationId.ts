import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRoleEscalation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminRoleEscalationsRoleEscalationId(props: {
  admin: AdminPayload;
  roleEscalationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRoleEscalation> {
  const row = await MyGlobal.prisma.shopping_mall_role_escalations.findUnique({
    where: { id: props.roleEscalationId },
  });

  if (!row) {
    throw new HttpException("Role escalation not found.", 404);
  }

  return {
    id: row.id,
    requestor_actor_id: row.requestor_actor_id ?? null,
    requestor_seller_id: row.requestor_seller_id ?? null,
    processed_by_admin_id: row.processed_by_admin_id ?? null,
    target_role: row.target_role,
    status: row.status,
    reason: row.reason ?? null,
    created_at: toISOStringSafe(row.created_at),
    processed_at:
      (row.processed_at ?? null)
        ? row.processed_at
          ? toISOStringSafe(row.processed_at)
          : null
        : null,
  };
}
