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

export async function getShoppingAdminAppealsAppealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IShoppingAppeal> {
  const appeal = await MyGlobal.prisma.shopping_appeals.findFirst({
    where: {
      id: props.appealId,
      deleted_at: null,
    },
  });
  if (!appeal) throw new HttpException("Appeal not found", 404);

  // Determine filer_actor_type / filer_actor_id
  let filer_actor_type: string;
  let filer_actor_id: string & tags.Format<"uuid">;
  if (appeal.filed_by_admin_id) {
    filer_actor_type = "admin";
    filer_actor_id = appeal.filed_by_admin_id as string & tags.Format<"uuid">;
  } else if (appeal.filed_by_seller_id) {
    filer_actor_type = "seller";
    filer_actor_id = appeal.filed_by_seller_id as string & tags.Format<"uuid">;
  } else if (appeal.filed_by_customer_id) {
    filer_actor_type = "customer";
    filer_actor_id = appeal.filed_by_customer_id as string &
      tags.Format<"uuid">;
  } else {
    throw new HttpException("Unknown filer in appeal", 500);
  }

  // Related policy violation
  let relatedPolicyViolation: IShoppingPolicyViolation.ISummary | undefined =
    undefined;
  if (appeal.appeal_of_policy_violation_id) {
    const policyViolation =
      await MyGlobal.prisma.shopping_policy_violations.findFirst({
        where: { id: appeal.appeal_of_policy_violation_id, deleted_at: null },
      });
    if (policyViolation) {
      let relatedPolicy: IShoppingBusinessPolicy.ISummary | undefined =
        undefined;
      const policy = await MyGlobal.prisma.shopping_business_policies.findFirst(
        {
          where: { id: policyViolation.policy_id, deleted_at: null },
        },
      );
      if (policy) {
        relatedPolicy = {
          id: policy.id,
          policy_name: policy.policy_name,
          scope: policy.scope,
          value: policy.value,
          description: policy.description,
          active: policy.active,
          created_at: toISOStringSafe(policy.created_at),
          updated_at: toISOStringSafe(policy.updated_at),
        };
      }
      relatedPolicyViolation = {
        id: policyViolation.id,
        policy_id: policyViolation.policy_id,
        violation_type: policyViolation.violation_type,
        violation_code: policyViolation.violation_code,
        status: policyViolation.status,
        decision: policyViolation.decision ?? null,
        description: policyViolation.description ?? null,
        created_at: toISOStringSafe(policyViolation.created_at),
        updated_at: toISOStringSafe(policyViolation.updated_at),
        decision_at: policyViolation.decision_at
          ? toISOStringSafe(policyViolation.decision_at)
          : null,
        policy: relatedPolicy!,
      };
    }
  }

  // Related suspension
  let relatedSuspension: IShoppingAdminSuspension.ISummary | undefined =
    undefined;
  if (appeal.appeal_of_suspension_id) {
    const suspension =
      await MyGlobal.prisma.shopping_admin_suspensions.findFirst({
        where: { id: appeal.appeal_of_suspension_id, deleted_at: null },
      });
    if (suspension) {
      relatedSuspension = {
        id: suspension.id,
        admin_id: suspension.admin_id,
        suspended_admin_id: suspension.suspended_admin_id ?? null,
        suspended_seller_id: suspension.suspended_seller_id ?? null,
        suspended_customer_id: suspension.suspended_customer_id ?? null,
        suspension_type: suspension.suspension_type,
        reason: suspension.reason,
        start_at: toISOStringSafe(suspension.start_at),
        end_at: suspension.end_at ? toISOStringSafe(suspension.end_at) : null,
        status: suspension.status,
        created_at: toISOStringSafe(suspension.created_at),
        updated_at: toISOStringSafe(suspension.updated_at),
        deleted_at: suspension.deleted_at
          ? toISOStringSafe(suspension.deleted_at)
          : null,
      };
    }
  }

  // affected_actor_type/id come ONLY from relatedSuspension, else undefined
  let affected_actor_type: string | undefined = undefined;
  let affected_actor_id: (string & tags.Format<"uuid">) | undefined = undefined;
  if (relatedSuspension) {
    if (relatedSuspension.suspended_admin_id) {
      affected_actor_type = "admin";
      affected_actor_id = relatedSuspension.suspended_admin_id;
    } else if (relatedSuspension.suspended_seller_id) {
      affected_actor_type = "seller";
      affected_actor_id = relatedSuspension.suspended_seller_id;
    } else if (relatedSuspension.suspended_customer_id) {
      affected_actor_type = "customer";
      affected_actor_id = relatedSuspension.suspended_customer_id;
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
    filer_actor_type,
    filer_actor_id,
    affected_actor_type,
    affected_actor_id,
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
    related_policy_violation: relatedPolicyViolation,
    related_suspension: relatedSuspension,
  };
}
