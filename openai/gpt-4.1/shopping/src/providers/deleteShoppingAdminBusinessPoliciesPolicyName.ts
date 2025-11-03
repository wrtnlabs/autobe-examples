import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminBusinessPoliciesPolicyName(props: {
  admin: AdminPayload;
  policyName: string;
}): Promise<void> {
  // 1. Find policy by policy_name
  const policy = await MyGlobal.prisma.shopping_business_policies.findFirst({
    where: {
      policy_name: props.policyName,
    },
  });
  if (!policy) {
    throw new HttpException("Business policy not found", 404);
  }

  // 2. Delete the policy by id (id is primary key)
  await MyGlobal.prisma.shopping_business_policies.delete({
    where: { id: policy.id },
  });

  // 3. Audit log
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      seller_id: null,
      customer_id: null,
      category: "policy",
      event_type: "DELETE_POLICY",
      ip: null,
      description: `Deleted business policy: ${policy.policy_name}`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // No return value
}
