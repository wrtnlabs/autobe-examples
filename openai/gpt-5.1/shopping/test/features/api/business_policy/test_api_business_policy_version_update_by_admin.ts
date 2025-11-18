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
 * Validate updating an existing business policy version by an authenticated
 * admin.
 *
 * Business context:
 *
 * - Admins can define logical business policies (refund, risk, review, etc.).
 * - Each policy has multiple concrete versions (IShoppingMallPolicyVersion).
 * - Mutable fields of a version (title, body_markdown, parameters_json, status,
 *   effective window) can be revised without changing its identity (id,
 *   version_code, parent policy linkage).
 *
 * Scenario steps:
 *
 * 1. Admin joins the platform (POST /auth/admin/join) to obtain an authorized
 *    admin context.
 * 2. Admin creates a parent business policy definition using
 *    IShoppingMallBusinessPolicy.ICreate.
 * 3. Admin creates an initial policy version for that policy using
 *    IShoppingMallPolicyVersion.ICreate.
 * 4. Admin updates that version via PUT
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions/{versionCode}
 *    using IShoppingMallPolicyVersion.IUpdate, changing
 *    title/body_markdown/parameters_json.
 * 5. Validate that the returned version preserves identity and parent linkage but
 *    reflects updated mutable fields and refreshed updated_at audit timestamp.
 */
export async function test_api_business_policy_version_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join to get authorized admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create parent business policy
  const policyCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.name(),
    category: RandomGenerator.pick([
      "refund",
      "review",
      "seller",
      "risk",
      "shipping",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(policy);

  TestValidator.equals(
    "created policy_code should match input",
    policy.policy_code,
    policyCode,
  );

  // 3. Create initial policy version under that policy
  const initialVersionCode = `v${RandomGenerator.alphaNumeric(4)}`;
  const initialParameters = JSON.stringify({
    refundWindowDays: 7,
    maxRefundAmount: 100000,
  });

  const now = new Date();
  const effectiveFrom = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const versionCreateBody = {
    version_code: initialVersionCode,
    title: "Initial Refund Policy v1",
    body_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    parameters_json: initialParameters,
    status: "draft",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const originalVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policyCode,
        body: versionCreateBody,
      },
    );
  typia.assert(originalVersion);

  TestValidator.equals(
    "version policy code should match parent summary code",
    originalVersion.policy.code,
    policy.policy_code,
  );
  TestValidator.equals(
    "version_code should match creation body",
    originalVersion.version_code,
    initialVersionCode,
  );

  const originalId = originalVersion.id;
  const originalCreatedAt = originalVersion.created_at;
  const originalUpdatedAt = originalVersion.updated_at;
  const originalDeletedAt = originalVersion.deleted_at ?? null;

  // 4. Update the policy version: change title, body_markdown, parameters_json only
  const updatedTitle = "Updated Refund Policy Heading";
  const updatedBodyMarkdown = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 12,
    wordMin: 3,
    wordMax: 9,
  });
  const updatedParametersJson = JSON.stringify({
    refundWindowDays: 14,
    maxRefundAmount: 150000,
    requireReason: true,
  });

  const updateBody = {
    title: updatedTitle,
    body_markdown: updatedBodyMarkdown,
    parameters_json: updatedParametersJson,
  } satisfies IShoppingMallPolicyVersion.IUpdate;

  const updatedVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.update(
      connection,
      {
        policyCode: policyCode,
        versionCode: originalVersion.version_code,
        body: updateBody,
      },
    );
  typia.assert(updatedVersion);

  // 5. Business assertions: identity preserved, mutable fields updated, audit timestamps sensible
  TestValidator.equals(
    "updated version id should be unchanged",
    updatedVersion.id,
    originalId,
  );
  TestValidator.equals(
    "updated version policy code should remain linked to same policy",
    updatedVersion.policy.code,
    policy.policy_code,
  );
  TestValidator.equals(
    "updated version_code should remain unchanged",
    updatedVersion.version_code,
    initialVersionCode,
  );

  TestValidator.equals(
    "title should be updated",
    updatedVersion.title,
    updatedTitle,
  );
  TestValidator.equals(
    "body_markdown should be updated",
    updatedVersion.body_markdown,
    updatedBodyMarkdown,
  );
  TestValidator.equals(
    "parameters_json should be updated",
    updatedVersion.parameters_json ?? null,
    updatedParametersJson,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedVersion.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be same or later than original updated_at",
    new Date(updatedVersion.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  TestValidator.predicate(
    "updated_at should not equal created_at after modification",
    updatedVersion.updated_at !== updatedVersion.created_at,
  );

  TestValidator.equals(
    "deleted_at should remain unchanged (typically null)",
    updatedVersion.deleted_at ?? null,
    originalDeletedAt,
  );
}
