import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate basic admin flow for retrieving a specific business policy version
 * detail.
 *
 * Business context: An administrator manages governance policies in the
 * shopping mall backend. Each business policy (identified by a stable
 * policy_code) can have multiple versions, each with its own version_code,
 * markdown body, parameters, status, and effective window. Admins must be able
 * to drill down into a specific version using its policyCode and versionCode to
 * inspect the full configuration.
 *
 * This test verifies the happy-path where:
 *
 * 1. An admin account is registered and authenticated.
 * 2. A parent business policy is created.
 * 3. A concrete version is created under that policy.
 * 4. The version detail is retrieved by (policyCode, versionCode).
 * 5. The returned payload matches the created version and is logically consistent.
 *
 * Steps:
 *
 * 1. Call POST /auth/admin/join to register an admin and implicitly authenticate.
 * 2. Call POST /shoppingMall/admin/businessPolicies to create a business policy
 *    and capture its policy_code.
 * 3. Call POST /shoppingMall/admin/businessPolicies/{policyCode}/versions to
 *    create a version with a distinctive version_code and payload.
 * 4. Call GET
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions/{versionCode}
 *    to fetch the detail for that exact version.
 * 5. Assert that the returned IShoppingMallPolicyVersion:
 *
 *    - Has policy.code equal to the created policy_code.
 *    - Has version_code equal to the created version_code.
 *    - Has title, body_markdown, status, parameters_json, effective_from, and
 *         effective_until equal to the creation payload.
 *    - Has created_at and updated_at populated, with updated_at >= created_at.
 */
export async function test_api_business_policy_version_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
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
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a business policy
  const policyCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(createdPolicy);

  TestValidator.equals(
    "created policy_code should match request",
    createdPolicy.policy_code,
    policyCode,
  );

  // 3. Create a specific policy version for the created policy
  const versionCode = `v_${RandomGenerator.alphaNumeric(6)}`;
  const statusOptions = ["draft", "active", "retired"] as const;
  const status = RandomGenerator.pick(statusOptions);

  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const parametersObject = {
    max_refund_days: 30,
    allow_partial_refund: true,
  };
  const parametersJson = JSON.stringify(parametersObject);

  const versionCreateBody = {
    version_code: versionCode,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: parametersJson,
    status,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const createdVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: createdPolicy.policy_code,
        body: versionCreateBody,
      },
    );
  typia.assert(createdVersion);

  TestValidator.equals(
    "created version policy.code should match policyCode",
    createdVersion.policy.code,
    createdPolicy.policy_code,
  );
  TestValidator.equals(
    "created version_code should match request",
    createdVersion.version_code,
    versionCode,
  );

  // 4. Retrieve the specific version by (policyCode, versionCode)
  const retrieved: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.at(
      connection,
      {
        policyCode: createdPolicy.policy_code,
        versionCode,
      },
    );
  typia.assert(retrieved);

  // 5. Validate core fields
  TestValidator.equals(
    "retrieved policy.code should match created policy_code",
    retrieved.policy.code,
    createdPolicy.policy_code,
  );
  TestValidator.equals(
    "retrieved version_code should match created",
    retrieved.version_code,
    versionCode,
  );
  TestValidator.equals(
    "retrieved title should match created",
    retrieved.title,
    versionCreateBody.title,
  );
  TestValidator.equals(
    "retrieved body_markdown should match created",
    retrieved.body_markdown,
    versionCreateBody.body_markdown,
  );
  TestValidator.equals(
    "retrieved status should match created",
    retrieved.status,
    versionCreateBody.status,
  );
  TestValidator.equals(
    "retrieved parameters_json should match created",
    retrieved.parameters_json ?? null,
    versionCreateBody.parameters_json ?? null,
  );
  TestValidator.equals(
    "retrieved effective_from should match created",
    retrieved.effective_from ?? null,
    versionCreateBody.effective_from ?? null,
  );
  TestValidator.equals(
    "retrieved effective_until should match created",
    retrieved.effective_until ?? null,
    versionCreateBody.effective_until ?? null,
  );

  // Timestamp logical consistency: updated_at >= created_at
  const createdAt = new Date(retrieved.created_at).getTime();
  const updatedAt = new Date(retrieved.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedAt >= createdAt,
  );
}
