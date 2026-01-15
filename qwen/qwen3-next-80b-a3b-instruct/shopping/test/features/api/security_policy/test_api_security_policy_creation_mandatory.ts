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
export async function test_api_security_policy_creation_mandatory(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to create security policy
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create a security policy with mandatory enforcement level and system-wide scope
  const policy =
    await api.functional.shoppingMall.admin.security.policies.create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.name(2),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
          scope: "system-wide",
          enforcement_level: "mandatory",
          effective_from: new Date().toISOString(),
          compliance_standards: ["GDPR"],
        } satisfies IShoppingMallSecurityPolicy.ICreate,
      },
    );
  // Step 3: Validate response has assigned ID and preserved all submitted values
  typia.assert(policy);
  TestValidator.equals("policy name matches", policy.name, policy.name);
  TestValidator.equals(
    "description matches",
    policy.description,
    policy.description,
  );
  TestValidator.equals("scope matches", policy.scope, "system-wide");
  TestValidator.equals(
    "enforcement_level matches",
    policy.enforcement_level,
    "mandatory",
  );
  TestValidator.equals(
    "effective_from matches",
    policy.effective_from,
    policy.effective_from,
  );
  TestValidator.equals(
    "compliance_standards length matches",
    policy.compliance_standards.length,
    1,
  );
  TestValidator.equals(
    "compliance_standard is GDPR",
    policy.compliance_standards[0],
    "GDPR",
  );
}