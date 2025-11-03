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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerAppealsAppealId(props: {
  seller: SellerPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IShoppingAppeal> {
  const { seller, appealId } = props;

  // Fetch the appeal, enforce ownership by current seller and not deleted
  const appeal = await MyGlobal.prisma.shopping_appeals.findFirst({
    where: {
      id: appealId,
      deleted_at: null,
      filed_by_seller_id: seller.id,
    },
  });
  if (!appeal)
    throw new HttpException("Appeal not found or access denied", 404);

  // Fetch related policy violation (summary) if FK exists
  let related_policy_violation: IShoppingPolicyViolation.ISummary | undefined =
    undefined;
  if (appeal.appeal_of_policy_violation_id) {
    const violation =
      await MyGlobal.prisma.shopping_policy_violations.findFirst({
        where: { id: appeal.appeal_of_policy_violation_id },
      });
    if (violation) {
      const policy = await MyGlobal.prisma.shopping_business_policies.findFirst(
        {
          where: { id: violation.policy_id },
        },
      );
      if (policy) {
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
            id: policy.id,
            policy_name: policy.policy_name,
            scope: policy.scope,
            value: policy.value,
            description: policy.description,
            active: policy.active,
            created_at: toISOStringSafe(policy.created_at),
            updated_at: toISOStringSafe(policy.updated_at),
          },
        };
      }
    }
  }

  // Fetch related suspension (summary) if FK exists
  let related_suspension: IShoppingAdminSuspension.ISummary | undefined =
    undefined;
  if (appeal.appeal_of_suspension_id) {
    const suspension =
      await MyGlobal.prisma.shopping_admin_suspensions.findFirst({
        where: { id: appeal.appeal_of_suspension_id },
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

  return {
    id: appeal.id,
    status: appeal.status,
    type: appeal.appeal_of_policy_violation_id
      ? "policy_violation"
      : appeal.appeal_of_suspension_id
        ? "suspension"
        : "account_action",
    reason: appeal.reason,
    filer_actor_type: "seller",
    filer_actor_id: appeal.filed_by_seller_id!, // never null by WHERE filter, assert non-null
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
    related_policy_violation: related_policy_violation,
    related_suspension: related_suspension,
  };
}
