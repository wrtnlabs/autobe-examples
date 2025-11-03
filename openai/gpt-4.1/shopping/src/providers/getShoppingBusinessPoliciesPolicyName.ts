import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";

export async function getShoppingBusinessPoliciesPolicyName(props: {
  policyName: string;
}): Promise<IShoppingBusinessPolicy> {
  const targetName = props.policyName.toLowerCase();
  const found = await MyGlobal.prisma.shopping_business_policies.findFirst({
    where: {
      active: true,
      deleted_at: null,
      // Prisma does NOT support mode: 'insensitive' on SQLite, so use workaround
      // Compare after lowercasing both sides (in JS for cross-db compatibility)
    },
  });
  // For cross-database compatibility, perform the case-insensitive policy_name check in-memory
  if (!found || found.policy_name.toLowerCase() !== targetName) {
    throw new HttpException("Business policy not found", 404);
  }
  return {
    id: found.id,
    policy_name: found.policy_name,
    scope: found.scope,
    value: found.value,
    description: found.description,
    active: found.active,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
