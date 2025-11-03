import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAppeal";
import { IShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPolicyViolation";
import { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";
import { IShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSuspension";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminAppealsAppealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
  body: IShoppingAppeal.IUpdate;
}): Promise<IShoppingAppeal> {
  // Find the target appeal (must not be soft-deleted)
  const appeal = await MyGlobal.prisma.shopping_appeals.findUnique({
    where: { id: props.appealId, deleted_at: null },
  });
  if (!appeal) throw new HttpException("Appeal not found", 404);

  const data: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.status !== undefined) data.status = props.body.status;
  if (props.body.decision !== undefined) data.decision = props.body.decision;
  if (props.body.decision_at !== undefined)
    data.decision_at = props.body.decision_at;
  if (props.body.reason !== undefined) data.reason = props.body.reason;

  const updated = await MyGlobal.prisma.shopping_appeals.update({
    where: { id: props.appealId },
    data,
  });

  // Determine filer_actor_type/id
  let filer_actor_type: string;
  let filer_actor_id: string & tags.Format<"uuid">;
  if (updated.filed_by_admin_id) {
    filer_actor_type = "admin";
    filer_actor_id = updated.filed_by_admin_id as string & tags.Format<"uuid">;
  } else if (updated.filed_by_seller_id) {
    filer_actor_type = "seller";
    filer_actor_id = updated.filed_by_seller_id as string & tags.Format<"uuid">;
  } else if (updated.filed_by_customer_id) {
    filer_actor_type = "customer";
    filer_actor_id = updated.filed_by_customer_id as string &
      tags.Format<"uuid">;
  } else {
    filer_actor_type = "unknown";
    filer_actor_id = "" as string & tags.Format<"uuid">;
  }

  // Map type (appeal type) based on referenced fields
  let type = "account_action";
  if (updated.appeal_of_suspension_id) type = "suspension";
  else if (updated.appeal_of_policy_violation_id) type = "policy_violation";

  // Determine affected actor info (not available in core appeals schema, set undefined)
  let affected_actor_type: string | undefined = undefined;
  let affected_actor_id: (string & tags.Format<"uuid">) | undefined = undefined;
  // Only possible to deduce by joining related tables, omitted here.

  // Create audit event if status actually changes
  let audit_history: IShoppingAppeal.IAuditHistory[] | undefined = undefined;
  if (
    (props.body.status !== undefined && appeal.status !== props.body.status) ||
    (props.body.decision !== undefined &&
      appeal.decision !== props.body.decision)
  ) {
    audit_history = [
      {
        timestamp: toISOStringSafe(updated.updated_at),
        status_from: appeal.status,
        status_to: updated.status,
        actor_type: "admin",
        actor_id: props.admin.id,
        context:
          props.body.reason !== undefined ? props.body.reason : undefined,
      },
    ];
  }

  return {
    id: updated.id,
    status: updated.status,
    type,
    reason: updated.reason,
    filer_actor_type,
    filer_actor_id,
    affected_actor_type,
    affected_actor_id,
    appeal_of_policy_violation_id:
      updated.appeal_of_policy_violation_id ?? undefined,
    appeal_of_suspension_id: updated.appeal_of_suspension_id ?? undefined,
    decision: updated.decision ?? undefined,
    decision_reason: undefined,
    decision_at: updated.decision_at
      ? toISOStringSafe(updated.decision_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    audit_history,
    attachments: undefined,
    related_policy_violation: undefined,
    related_suspension: undefined,
  };
}
