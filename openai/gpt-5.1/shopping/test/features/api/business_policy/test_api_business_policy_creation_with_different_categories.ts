import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

export async function test_api_business_policy_creation_with_different_categories(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare three distinct business policy creation payloads
  const policyABody = {
    policy_code: "refund_standard",
    name: "Standard Refund Policy",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policyBBody = {
    policy_code: "seller_rules",
    name: "Seller Governance Policy",
    category: "seller",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policyCBody = {
    policy_code: "risk_controls",
    name: "Risk Management Policy",
    category: "risk",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  // 3. Create policies via the admin businessPolicies.create endpoint
  const policyA: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyABody,
      },
    );
  typia.assert(policyA);

  const policyB: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyBBody,
      },
    );
  typia.assert(policyB);

  const policyC: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCBody,
      },
    );
  typia.assert(policyC);

  // 4. Validate that each created policy reflects the requested category and policy_code
  TestValidator.equals(
    "policy A category should be 'refund'",
    policyA.category,
    policyABody.category,
  );
  TestValidator.equals(
    "policy A policy_code should match request",
    policyA.policy_code,
    policyABody.policy_code,
  );
  TestValidator.equals(
    "policy A is_active should be true",
    policyA.is_active,
    true,
  );

  TestValidator.equals(
    "policy B category should be 'seller'",
    policyB.category,
    policyBBody.category,
  );
  TestValidator.equals(
    "policy B policy_code should match request",
    policyB.policy_code,
    policyBBody.policy_code,
  );
  TestValidator.equals(
    "policy B is_active should be true",
    policyB.is_active,
    true,
  );

  TestValidator.equals(
    "policy C category should be 'risk'",
    policyC.category,
    policyCBody.category,
  );
  TestValidator.equals(
    "policy C policy_code should match request",
    policyC.policy_code,
    policyCBody.policy_code,
  );
  TestValidator.equals(
    "policy C is_active should be true",
    policyC.is_active,
    true,
  );

  // 5. Cross-policy uniqueness checks for ids and policy_code values
  TestValidator.notEquals(
    "policy A and B should have different ids",
    policyA.id,
    policyB.id,
  );
  TestValidator.notEquals(
    "policy A and C should have different ids",
    policyA.id,
    policyC.id,
  );
  TestValidator.notEquals(
    "policy B and C should have different ids",
    policyB.id,
    policyC.id,
  );

  TestValidator.notEquals(
    "policy_code of A and B should differ",
    policyA.policy_code,
    policyB.policy_code,
  );
  TestValidator.notEquals(
    "policy_code of A and C should differ",
    policyA.policy_code,
    policyC.policy_code,
  );
  TestValidator.notEquals(
    "policy_code of B and C should differ",
    policyB.policy_code,
    policyC.policy_code,
  );
}
