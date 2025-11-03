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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerAppealsAppealId(props: {
  customer: CustomerPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IShoppingAppeal> {
  // Only query on fields that exist in the schema
  const appeal = await MyGlobal.prisma.shopping_appeals.findFirst({
    where: {
      id: props.appealId,
      deleted_at: null,
      // Prisma does NOT support filtering by actor type/id; API can only GET appeals user created if their id matches
      // The controller/auth layer already guarantees the customer can only see their own records
      // But Prisma model does not have filer_actor_type, must use filed_by_customer_id
      filed_by_customer_id: props.customer.id,
    },
  });
  if (!appeal) {
    throw new HttpException("Appeal not found or access denied", 404);
  }

  // Related policy violation (if any) - include if exists
  let related_policy_violation: IShoppingPolicyViolation.ISummary | undefined =
    undefined;
  if (appeal.appeal_of_policy_violation_id) {
    const violation =
      await MyGlobal.prisma.shopping_policy_violations.findFirst({
        where: { id: appeal.appeal_of_policy_violation_id, deleted_at: null },
        include: { policy: true },
      });
    if (violation && violation.policy) {
      related_policy_violation = {
        id: violation.id,
        policy_id: violation.policy_id,
        violation_type: violation.violation_type,
        violation_code: violation.violation_code,
        status: violation.status,
        decision: violation.decision ?? undefined,
        description: violation.description ?? undefined,
        created_at: toISOStringSafe(violation.created_at),
        updated_at: toISOStringSafe(violation.updated_at),
        decision_at: violation.decision_at
          ? toISOStringSafe(violation.decision_at)
          : undefined,
        policy: {
          id: violation.policy.id,
          policy_name: violation.policy.policy_name,
          scope: violation.policy.scope,
          value: violation.policy.value,
          description: violation.policy.description,
          active: violation.policy.active,
          created_at: toISOStringSafe(violation.policy.created_at),
          updated_at: toISOStringSafe(violation.policy.updated_at),
        },
      };
    }
  }

  // Related suspension (if any)
  let related_suspension: IShoppingAdminSuspension.ISummary | undefined =
    undefined;
  if (appeal.appeal_of_suspension_id) {
    const suspension =
      await MyGlobal.prisma.shopping_admin_suspensions.findFirst({
        where: { id: appeal.appeal_of_suspension_id, deleted_at: null },
      });
    if (suspension) {
      related_suspension = {
        id: suspension.id,
        admin_id: suspension.admin_id,
        suspended_admin_id: suspension.suspended_admin_id ?? undefined,
        suspended_seller_id: suspension.suspended_seller_id ?? undefined,
        suspended_customer_id: suspension.suspended_customer_id ?? undefined,
        suspension_type: suspension.suspension_type,
        reason: suspension.reason,
        start_at: toISOStringSafe(suspension.start_at),
        end_at: suspension.end_at
          ? toISOStringSafe(suspension.end_at)
          : undefined,
        status: suspension.status,
        created_at: toISOStringSafe(suspension.created_at),
        updated_at: toISOStringSafe(suspension.updated_at),
        deleted_at: suspension.deleted_at
          ? toISOStringSafe(suspension.deleted_at)
          : undefined,
      };
    }
  }

  // No audit_history or attachments in schema.
  // Return all fields the API expects with appropriate null/undefined for ones missing in schema.
  return {
    id: appeal.id,
    status: appeal.status,
    type: "unknown", // Not in schema; placeholder or use nullable/omitted per API
    reason: appeal.reason,
    filer_actor_type: "customer", // Driven by context (customer only for this handler)
    filer_actor_id: props.customer.id, // Not present directly in schema, get from context
    affected_actor_type: undefined,
    affected_actor_id: undefined,
    appeal_of_policy_violation_id:
      appeal.appeal_of_policy_violation_id ?? undefined,
    appeal_of_suspension_id: appeal.appeal_of_suspension_id ?? undefined,
    decision: appeal.decision ?? undefined,
    decision_reason: undefined,
    decision_at: appeal.decision_at
      ? toISOStringSafe(appeal.decision_at)
      : undefined,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
    audit_history: undefined,
    attachments: undefined,
    related_policy_violation,
    related_suspension,
  };
}
