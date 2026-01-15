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
export async function test_api_security_policy_retrieval_by_admin(
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
        href: "https://example.com/join",
        referrer: "https://example.com/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // Step 2: Create a security policy using admin connection
  const policy: IShoppingMallSecurityPolicy =
    await generate_random_shopping_mall_admin_security_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 1 }),
          scope: RandomGenerator.pick([
            "system-wide",
            "user-level",
            "payment-related",
          ] as const),
          enforcement_level: RandomGenerator.pick([
            "mandatory",
            "recommended",
            "optional",
          ] as const),
          effective_from: new Date().toISOString(),
          compliance_standards: ["GDPR", "PCI-DSS"],
        } satisfies IShoppingMallSecurityPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // Step 3: Retrieve the created security policy by ID using admin connection
  const retrievedPolicy: IShoppingMallSecurityPolicy =
    await api.functional.shoppingMall.admin.security.policies.at(
      adminConnection,
      {
        policyId: policy.id,
      },
    );
  typia.assert(retrievedPolicy);
  // Step 4: Validate that retrieved policy matches the created policy
  TestValidator.equals("policy ID matches", retrievedPolicy.id, policy.id);
  TestValidator.equals(
    "policy name matches",
    retrievedPolicy.name,
    policy.name,
  );
  TestValidator.equals(
    "policy description matches",
    retrievedPolicy.description,
    policy.description,
  );
  TestValidator.equals(
    "policy scope matches",
    retrievedPolicy.scope,
    policy.scope,
  );
  TestValidator.equals(
    "policy enforcement level matches",
    retrievedPolicy.enforcement_level,
    policy.enforcement_level,
  );
  TestValidator.equals(
    "policy effective from matches",
    retrievedPolicy.effective_from,
    policy.effective_from,
  );
  TestValidator.equals(
    "policy effective until matches",
    retrievedPolicy.effective_until,
    policy.effective_until,
  );
  TestValidator.equals(
    "policy compliance standards match",
    retrievedPolicy.compliance_standards,
    policy.compliance_standards,
  );
  // Step 5: Verify that unauthorized user cannot access the policy
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user cannot access security policy",
    async () => {
      await api.functional.shoppingMall.admin.security.policies.at(
        unauthorizedConnection,
        {
          policyId: policy.id,
        },
      );
    },
  );
}
