import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSecurityPolicies } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityPolicies";
import { IShoppingMallSecurityPoliciesPasswordComplexity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityPoliciesPasswordComplexity";
import { IShoppingMallSecurityPoliciesSessionManagement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityPoliciesSessionManagement";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSecurityPoliciesTransformer {
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
        session_management: true,
      },
    } satisfies Prisma.shopping_mall_security_policiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSecurityPolicies> {
    return {
      passwordComplexity: JSON.parse(
        input.password_complexity,
      ) as IShoppingMallSecurityPoliciesPasswordComplexity,
      sessionManagement: JSON.parse(
        input.session_management,
      ) as IShoppingMallSecurityPoliciesSessionManagement,
    };
  }
}
