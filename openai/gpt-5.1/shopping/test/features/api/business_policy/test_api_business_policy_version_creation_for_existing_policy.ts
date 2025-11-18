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
 * Validate creation of a new business policy version under an existing policy.
 *
 * Business context:
 *
 * - Only authenticated admins may register business policies and their versions.
 * - A policy version must belong to an existing parent business policy.
 * - Policy versions carry human-readable markdown bodies plus optional JSON
 *   parameters and life-cycle metadata.
 *
 * Steps:
 *
 * 1. Register a new admin (join) and implicitly authenticate.
 * 2. Create a parent business policy with a unique policy_code.
 * 3. Create a new policy version under that policy using its policy_code.
 * 4. Validate that the created version is correctly linked and its fields reflect
 *    the request payload and expected defaults.
 * 5. (Optional) Try to create a duplicate version_code under the same policy and
 *    ensure the backend rejects it as a business logic error.
 */
export async function test_api_business_policy_version_creation_for_existing_policy(
  connection: api.IConnection,
) {
  // 1. Admin registration and implicit authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin-console.example.com/join",
    referrer: "https://landing.example.com/campaign/admin-join",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  TestValidator.equals(
    "joined admin email should match request email",
    adminAuthorized.email,
    adminJoinBody.email,
  );

  // 2. Create parent business policy
  const policyCodeSuffix = RandomGenerator.alphaNumeric(12);
  const policyCode = `refund_${policyCodeSuffix}`;

  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    category: "refund",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(businessPolicy);

  TestValidator.equals(
    "created business policy_code should match request",
    businessPolicy.policy_code,
    policyCreateBody.policy_code,
  );
  TestValidator.predicate(
    "created business policy must be active",
    businessPolicy.is_active === true,
  );

  // 3. Create policy version for the existing policy
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntilDate = RandomGenerator.date(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
    24 * 60 * 60 * 1000,
  );
  const effectiveUntil = effectiveUntilDate.toISOString();

  const versionCode = `v_${RandomGenerator.alphaNumeric(8)}`;

  const parametersPayload = {
    maxRefundDays: 30,
    allowPartialRefund: true,
    riskScoreThreshold: 0.8,
  };

  const versionCreateBody = {
    version_code: versionCode,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    body_markdown: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 10,
    }),
    parameters_json: JSON.stringify(parametersPayload),
    status: "draft",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: businessPolicy.policy_code,
        body: versionCreateBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);

  // Core business validations on created version
  TestValidator.equals(
    "policy version must be linked to the correct parent policy code",
    policyVersion.policy.code,
    businessPolicy.policy_code,
  );
  TestValidator.equals(
    "policy version_code should match request",
    policyVersion.version_code,
    versionCreateBody.version_code,
  );
  TestValidator.equals(
    "policy version title should match request",
    policyVersion.title,
    versionCreateBody.title,
  );
  TestValidator.equals(
    "policy version body_markdown should match request",
    policyVersion.body_markdown,
    versionCreateBody.body_markdown,
  );
  TestValidator.equals(
    "policy version status should be draft as requested",
    policyVersion.status,
    versionCreateBody.status,
  );
  TestValidator.equals(
    "policy version effective_from should match request",
    policyVersion.effective_from ?? null,
    versionCreateBody.effective_from ?? null,
  );
  TestValidator.equals(
    "policy version effective_until should match request",
    policyVersion.effective_until ?? null,
    versionCreateBody.effective_until ?? null,
  );

  TestValidator.predicate(
    "policy version created_at must be a non-empty string",
    typeof policyVersion.created_at === "string" &&
      policyVersion.created_at.length > 0,
  );
  TestValidator.predicate(
    "policy version updated_at must be a non-empty string",
    typeof policyVersion.updated_at === "string" &&
      policyVersion.updated_at.length > 0,
  );
  TestValidator.predicate(
    "policy version deleted_at should be null or undefined right after creation",
    policyVersion.deleted_at === null || policyVersion.deleted_at === undefined,
  );

  // 4. Optional: Try to create a duplicate version_code under the same policy
  const duplicateVersionBody = {
    version_code: versionCode, // duplicate within same policy
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    parameters_json: JSON.stringify({ maxRefundDays: 60 }),
    status: "draft",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  await TestValidator.error(
    "duplicate policy version_code under same policy should fail",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.create(
        connection,
        {
          policyCode: businessPolicy.policy_code,
          body: duplicateVersionBody,
        },
      );
    },
  );
}
