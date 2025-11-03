import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminBusinessPoliciesPolicyName(props: {
  admin: AdminPayload;
  policyName: string;
  body: IShoppingBusinessPolicy.IUpdate;
}): Promise<IShoppingBusinessPolicy> {
  const { policyName, body } = props;
  // Find by policy_name and not soft-deleted
  const existing = await MyGlobal.prisma.shopping_business_policies.findFirst({
    where: { policy_name: policyName, deleted_at: null },
  });
  if (!existing) {
    throw new HttpException("Business policy not found", 404);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_business_policies.update({
    where: { id: existing.id },
    data: {
      ...(body.scope !== undefined ? { scope: body.scope } : {}),
      ...(body.value !== undefined ? { value: body.value } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    policy_name: updated.policy_name,
    scope: updated.scope,
    value: updated.value,
    description: updated.description,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
