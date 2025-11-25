import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRoleEscalation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminRoleEscalationsRoleEscalationId(props: {
  admin: AdminPayload;
  roleEscalationId: string & tags.Format<"uuid">;
  body: IShoppingMallRoleEscalation.IUpdate;
}): Promise<IShoppingMallRoleEscalation> {
  const roleEscalation =
    await MyGlobal.prisma.shopping_mall_role_escalations.findUnique({
      where: { id: props.roleEscalationId },
    });
  if (!roleEscalation) {
    throw new HttpException("Role escalation request not found", 404);
  }

  const updateData: Record<string, unknown> = {};
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if ("reason" in props.body) {
    updateData.reason =
      props.body.reason === undefined ? null : props.body.reason;
  }
  // Always attribute this update to the acting admin (enforcement)
  updateData.processed_by_admin_id = props.admin.id;
  if ("processed_at" in props.body) {
    updateData.processed_at =
      props.body.processed_at === undefined ? null : props.body.processed_at;
  }

  const updated = await MyGlobal.prisma.shopping_mall_role_escalations.update({
    where: { id: props.roleEscalationId },
    data: updateData,
  });

  return {
    id: updated.id,
    requestor_actor_id:
      updated.requestor_actor_id === null
        ? undefined
        : updated.requestor_actor_id,
    requestor_seller_id:
      updated.requestor_seller_id === null
        ? undefined
        : updated.requestor_seller_id,
    processed_by_admin_id:
      updated.processed_by_admin_id === null
        ? undefined
        : updated.processed_by_admin_id,
    target_role: updated.target_role,
    status: updated.status,
    reason: updated.reason === null ? undefined : updated.reason,
    created_at: toISOStringSafe(updated.created_at),
    processed_at:
      updated.processed_at === null
        ? undefined
        : toISOStringSafe(updated.processed_at),
  };
}
