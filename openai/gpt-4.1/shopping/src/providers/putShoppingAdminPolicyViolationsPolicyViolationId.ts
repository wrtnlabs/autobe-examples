import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPolicyViolation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminPolicyViolationsPolicyViolationId(props: {
  admin: AdminPayload;
  policyViolationId: string & tags.Format<"uuid">;
  body: IShoppingPolicyViolation.IUpdate;
}): Promise<IShoppingPolicyViolation> {
  // 1. Find existing policy violation (must exist and not be soft-deleted)
  const violation = await MyGlobal.prisma.shopping_policy_violations.findFirst({
    where: {
      id: props.policyViolationId,
      deleted_at: null,
    },
  });
  if (!violation) {
    throw new HttpException("Policy violation not found", 404);
  }

  // 2. Update only mutable fields
  const updated = await MyGlobal.prisma.shopping_policy_violations.update({
    where: { id: props.policyViolationId },
    data: {
      violation_type: props.body.violation_type,
      violation_code: props.body.violation_code,
      description: props.body.description ?? null,
      status: props.body.status,
      decision: props.body.decision ?? null,
      decision_at: props.body.decision_at ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    policy_id: updated.policy_id,
    reported_by_admin_id: updated.reported_by_admin_id ?? undefined,
    reported_by_seller_id: updated.reported_by_seller_id ?? undefined,
    reported_by_customer_id: updated.reported_by_customer_id ?? undefined,
    affected_admin_id: updated.affected_admin_id ?? undefined,
    affected_seller_id: updated.affected_seller_id ?? undefined,
    affected_customer_id: updated.affected_customer_id ?? undefined,
    affected_product_id: updated.affected_product_id ?? undefined,
    affected_order_id: updated.affected_order_id ?? undefined,
    violation_type: updated.violation_type,
    violation_code: updated.violation_code,
    description: updated.description ?? undefined,
    status: updated.status,
    decision: updated.decision ?? undefined,
    decision_at: updated.decision_at
      ? toISOStringSafe(updated.decision_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
