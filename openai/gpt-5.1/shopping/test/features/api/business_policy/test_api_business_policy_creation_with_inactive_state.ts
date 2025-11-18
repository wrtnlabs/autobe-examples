import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

export async function test_api_business_policy_creation_with_inactive_state(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authorized admin context and JWT tokens.
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new business policy with is_active=false for staged rollout.
  const policyCode = "review_content_policy_".concat(
    RandomGenerator.alphaNumeric(8),
  );

  const createBody = {
    policy_code: policyCode,
    name: "Review Content Policy",
    category: "review",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 10,
    }),
    is_active: false,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createBody,
      },
    );

  // 3. Type-level validation of the created policy structure.
  typia.assert<IShoppingMallBusinessPolicy>(createdPolicy);

  // 4. Business assertions on the created policy fields.
  TestValidator.equals(
    "business policy should be created as inactive",
    createdPolicy.is_active,
    false,
  );

  TestValidator.equals(
    "business policy deleted_at must be null or undefined for newly created policy",
    createdPolicy.deleted_at ?? null,
    null,
  );

  TestValidator.equals(
    "business policy policy_code in response should match request payload",
    createdPolicy.policy_code,
    createBody.policy_code,
  );

  TestValidator.equals(
    "business policy name in response should match request payload",
    createdPolicy.name,
    createBody.name,
  );

  TestValidator.equals(
    "business policy category in response should match request payload",
    createdPolicy.category,
    createBody.category,
  );

  TestValidator.equals(
    "business policy description in response should match request payload",
    createdPolicy.description ?? null,
    createBody.description ?? null,
  );
}
