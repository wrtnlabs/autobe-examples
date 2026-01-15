import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityPolicy";
import { prepare_random_shopping_mall_security_policy } from "../../../prepare/prepare_random_shopping_mall_security_policy";
import { generate_random_shopping_mall_admin_security_policies_create } from "../../../generate/generate_random_shopping_mall_admin_security_policies_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_security_policy_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a security policy and store the policy_name
  const policyName = RandomGenerator.name();
  const securityPolicy: IShoppingMallSecurityPolicy =
    await generate_random_shopping_mall_admin_security_policies_create(
      adminConnection,
      {
        body: {
          policy_name: policyName,
          description: RandomGenerator.content(),
          scope: "system-wide" as const,
          enforcement_level: "mandatory" as const,
          effective_from: new Date().toISOString(),
          compliance_standards: ["GDPR", "ISO 27001"],
        } satisfies IShoppingMallSecurityPolicy.ICreate,
      },
    );
  typia.assert(securityPolicy);
  // Step 3: Delete the security policy
  await api.functional.shoppingMall.admin.security.policies.erase(
    adminConnection,
    {
      policyId: securityPolicy.id,
    },
  );
  // Step 4: Verify policy was deleted by attempting to create a new policy with the same name
  // This should fail with 409 Conflict due to policy_name uniqueness constraint
  await TestValidator.error(
    "deleted policy name should fail creation due to uniqueness constraint",
    async () => {
      await api.functional.shoppingMall.admin.security.policies.create(
        adminConnection,
        {
          body: {
            policy_name: policyName, // Use same name as deleted policy
            description: "Another description",
            scope: "system-wide" as const,
            enforcement_level: "mandatory" as const,
            effective_from: new Date().toISOString(),
            compliance_standards: ["GDPR", "ISO 27001"],
          } satisfies IShoppingMallSecurityPolicy.ICreate,
        },
      );
    },
  );
}
