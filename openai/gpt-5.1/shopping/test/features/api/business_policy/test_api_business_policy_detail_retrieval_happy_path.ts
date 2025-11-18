import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

export async function test_api_business_policy_detail_retrieval_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated context and token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy using the authenticated admin connection
  const policyCode: string = `policy_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdPolicy);

  // 3. Retrieve the business policy by policyCode
  const fetchedPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode,
    });
  typia.assert(fetchedPolicy);

  // 4. Validate that business fields are consistent between create and detail
  TestValidator.equals(
    "policy_code should match between created and fetched policies",
    fetchedPolicy.policy_code,
    createdPolicy.policy_code,
  );

  TestValidator.equals(
    "name should match between created and fetched policies",
    fetchedPolicy.name,
    createdPolicy.name,
  );

  TestValidator.equals(
    "category should match between created and fetched policies",
    fetchedPolicy.category,
    createdPolicy.category,
  );

  TestValidator.equals(
    "description should match between created and fetched policies",
    fetchedPolicy.description ?? null,
    createdPolicy.description ?? null,
  );

  TestValidator.equals(
    "is_active should match between created and fetched policies",
    fetchedPolicy.is_active,
    createdPolicy.is_active,
  );

  // 5. Validate identity and lifecycle fields
  TestValidator.equals(
    "id should be identical between created and fetched policies",
    fetchedPolicy.id,
    createdPolicy.id,
  );

  TestValidator.predicate(
    "created_at should remain the same between created and fetched policies",
    fetchedPolicy.created_at === createdPolicy.created_at,
  );

  TestValidator.predicate(
    "updated_at should be equal between created and fetched policies on immediate fetch",
    fetchedPolicy.updated_at === createdPolicy.updated_at,
  );

  TestValidator.equals(
    "deleted_at should be consistent and null for newly created policy",
    fetchedPolicy.deleted_at ?? null,
    createdPolicy.deleted_at ?? null,
  );
}
