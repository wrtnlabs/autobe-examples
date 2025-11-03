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

export async function getShoppingAdminPolicyViolationsPolicyViolationId(props: {
  admin: AdminPayload;
  policyViolationId: string & tags.Format<"uuid">;
}): Promise<IShoppingPolicyViolation> {
  const row =
    await MyGlobal.prisma.shopping_policy_violations.findUniqueOrThrow({
      where: { id: props.policyViolationId },
    });
  return {
    id: row.id,
    policy_id: row.policy_id,
    reported_by_admin_id: row.reported_by_admin_id ?? undefined,
    reported_by_seller_id: row.reported_by_seller_id ?? undefined,
    reported_by_customer_id: row.reported_by_customer_id ?? undefined,
    affected_admin_id: row.affected_admin_id ?? undefined,
    affected_seller_id: row.affected_seller_id ?? undefined,
    affected_customer_id: row.affected_customer_id ?? undefined,
    affected_product_id: row.affected_product_id ?? undefined,
    affected_order_id: row.affected_order_id ?? undefined,
    violation_type: row.violation_type,
    violation_code: row.violation_code,
    description: row.description ?? undefined,
    status: row.status,
    decision: row.decision ?? undefined,
    decision_at: row.decision_at ? toISOStringSafe(row.decision_at) : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  };
}
