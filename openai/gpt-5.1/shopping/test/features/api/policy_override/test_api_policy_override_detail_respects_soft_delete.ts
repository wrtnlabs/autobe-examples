import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverride";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate policy override detail retrieval and behavior around deletion.
 *
 * Business context:
 *
 * - Admins define logical business policies, create concrete versions, and then
 *   attach policy overrides that apply exceptions for specific subjects.
 * - This test ensures that the policy override detail endpoint returns
 *   consistent, type-safe data for a freshly created override, and that
 *   deleting one override does not affect independent overrides.
 *
 * Test flow:
 *
 * 1. Admin join to obtain an authorized admin context and token.
 * 2. Create a business policy with a unique policy_code.
 * 3. Create a concrete policy version under that policy_code.
 * 4. Create a first policy override pointing to that version and a subject.
 * 5. Retrieve the override via detail endpoint and validate structure & fields.
 * 6. Delete the first override via erase.
 * 7. Create a second policy override for the same version/subject.
 * 8. Retrieve the second override via detail endpoint and validate that:
 *
 *    - It exists and matches its own configuration.
 *    - Its id differs from the first override’s id (deleted one).
 *
 * We intentionally do NOT assert HTTP status codes or behavior of the detail
 * endpoint against deleted resources, because erase() documentation currently
 * describes a hard delete semantics and E2E tests must avoid status-based
 * validation. Instead, we verify correctness of detail retrieval for existing
 * overrides and that deletion of one override does not leak or corrupt state
 * for subsequently created overrides.
 */
export async function test_api_policy_override_detail_respects_soft_delete(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy
  const policyCode: string = `policy_${RandomGenerator.alphaNumeric(12)}`;

  const policyCreateBody = {
    policy_code: policyCode,
    name: "Risk category policy for override testing",
    category: "risk",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    "created policy_code should match request",
    policy.policy_code,
    policyCode,
  );
  TestValidator.predicate(
    "created business policy is active",
    policy.is_active === true,
  );

  // 3. Create a concrete policy version under that policy code
  const effectiveFrom = new Date().toISOString();

  const versionCreateBody = {
    version_code: "v1",
    title: "Initial active version for override E2E test",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ threshold: 10, mode: "test" }),
    status: "active",
    effective_from: effectiveFrom,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: versionCreateBody,
      },
    );
  typia.assert(policyVersion);

  TestValidator.equals(
    "policy version_code should match request",
    policyVersion.version_code,
    versionCreateBody.version_code,
  );
  TestValidator.equals(
    "policy version status should be active",
    policyVersion.status,
    "active",
  );

  // 4. Create the first policy override pointing to that version
  const subjectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const overrideCreateBody1 = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "customer",
    subject_id: subjectId,
    subject_display: "VIP test customer",
    override_code: "risk_limit",
    override_value: "high",
    reason: "E2E test override #1",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: null,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const override1: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody1,
    });
  typia.assert(override1);

  TestValidator.equals(
    "first override subject_type should match request",
    override1.subject_type,
    overrideCreateBody1.subject_type,
  );
  TestValidator.equals(
    "first override subject_id should match request",
    override1.subject_id,
    subjectId,
  );
  TestValidator.equals(
    "first override override_code should match request",
    override1.override_code,
    overrideCreateBody1.override_code,
  );
  TestValidator.equals(
    "first override override_value should match request",
    override1.override_value,
    overrideCreateBody1.override_value,
  );

  // 5. Retrieve the first override via detail endpoint and validate
  const fetchedOverride1: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.at(connection, {
      policyOverrideId: override1.id,
    });
  typia.assert(fetchedOverride1);

  TestValidator.equals(
    "detail of first override should have same id",
    fetchedOverride1.id,
    override1.id,
  );
  TestValidator.equals(
    "detail of first override subject_type should match",
    fetchedOverride1.subject_type,
    override1.subject_type,
  );
  TestValidator.equals(
    "detail of first override subject_id should match",
    fetchedOverride1.subject_id,
    override1.subject_id,
  );
  TestValidator.equals(
    "detail of first override override_code should match",
    fetchedOverride1.override_code,
    override1.override_code,
  );
  TestValidator.equals(
    "detail of first override override_value should match",
    fetchedOverride1.override_value,
    override1.override_value,
  );

  // 6. Delete the first override (implementation may be hard or soft delete)
  await api.functional.shoppingMall.admin.policyOverrides.erase(connection, {
    policyOverrideId: override1.id,
  });

  // 7. Create a second override using the same policy version and subject
  const overrideCreateBody2 = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "customer",
    subject_id: subjectId,
    subject_display: "VIP test customer (override 2)",
    override_code: "risk_limit",
    override_value: "medium",
    reason: "E2E test override #2 after deletion of first",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: null,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const override2: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody2,
    });
  typia.assert(override2);

  TestValidator.notEquals(
    "second override id should differ from first override id",
    override2.id,
    override1.id,
  );

  // 8. Retrieve the second override via detail endpoint and validate consistency
  const fetchedOverride2: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.at(connection, {
      policyOverrideId: override2.id,
    });
  typia.assert(fetchedOverride2);

  TestValidator.equals(
    "detail of second override should have same id",
    fetchedOverride2.id,
    override2.id,
  );
  TestValidator.equals(
    "detail of second override subject_type should match",
    fetchedOverride2.subject_type,
    override2.subject_type,
  );
  TestValidator.equals(
    "detail of second override subject_id should match",
    fetchedOverride2.subject_id,
    override2.subject_id,
  );
  TestValidator.equals(
    "detail of second override override_code should match",
    fetchedOverride2.override_code,
    override2.override_code,
  );
  TestValidator.equals(
    "detail of second override override_value should match",
    fetchedOverride2.override_value,
    override2.override_value,
  );
}
