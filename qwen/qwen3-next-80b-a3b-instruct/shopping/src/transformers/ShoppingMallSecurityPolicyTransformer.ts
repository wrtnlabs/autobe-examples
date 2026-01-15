import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityPolicy";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSecurityPolicyTransformer {
  export type Payload = Prisma.shopping_mall_security_policiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        password_complexity: true,
        min_password_length: true,
        max_password_age: true,
        session_timeout_minutes: true,
        ip_allow_list: true,
        ip_deny_list: true,
        version: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_security_policiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSecurityPolicy> {
    return {
      id: input.id,
      name: "Default Policy",
      description: "Default security policy",
      scope: "system-wide",
      enforcement_level: "mandatory",
      effective_from: input.created_at.toISOString(),
      effective_until: input.updated_at.toISOString(),
      compliance_standards: [],
    };
  }
}
