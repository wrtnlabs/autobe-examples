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

export async function postShoppingAdminBusinessPolicies(props: {
  admin: AdminPayload;
  body: IShoppingBusinessPolicy.ICreate;
}): Promise<IShoppingBusinessPolicy> {
  // Check uniqueness for (policy_name, scope)
  const existing = await MyGlobal.prisma.shopping_business_policies.findFirst({
    where: {
      policy_name: props.body.policy_name,
      scope: props.body.scope,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException(
      "A policy with the same name and scope already exists.",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const policy = await MyGlobal.prisma.shopping_business_policies.create({
    data: {
      id: v4(),
      policy_name: props.body.policy_name,
      scope: props.body.scope,
      value: props.body.value,
      description: props.body.description,
      active: props.body.active,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: policy.id,
    policy_name: policy.policy_name,
    scope: policy.scope,
    value: policy.value,
    description: policy.description,
    active: policy.active,
    created_at: toISOStringSafe(policy.created_at),
    updated_at: toISOStringSafe(policy.updated_at),
    deleted_at:
      policy.deleted_at == null ? null : toISOStringSafe(policy.deleted_at),
  };
}
