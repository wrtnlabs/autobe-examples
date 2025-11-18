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

export async function test_api_policy_override_update_reassign_policy_version(
  connection: api.IConnection,
) {
  // 1. Join as admin to get authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy
  const policyCode = `refund_policy_${RandomGenerator.alphaNumeric(8)}`;
  const businessPolicyBody = {
    policy_code: policyCode,
    name: "Refund Policy for E2E Test",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: businessPolicyBody,
      },
    );
  typia.assert(businessPolicy);

  TestValidator.equals(
    "created business policy has same policy_code",
    businessPolicy.policy_code,
    policyCode,
  );

  // 3. Create version A for this policy (active, effective in the past)
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago

  const versionABody = {
    version_code: "v1",
    title: "Refund Policy Version A",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ maxDays: 7, restockingFeePercent: 10 }),
    status: "active",
    effective_from: past.toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const versionA: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: versionABody,
      },
    );
  typia.assert(versionA);

  TestValidator.equals(
    "version A links to the created business policy via summary.code",
    versionA.policy?.code,
    policyCode,
  );

  // 4. Create version B for the same policy, also active
  const versionBCode = "v2";
  const versionBBody = {
    version_code: versionBCode,
    title: "Refund Policy Version B",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ maxDays: 14, restockingFeePercent: 5 }),
    status: "active",
    effective_from: past.toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const versionB: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: versionBBody,
      },
    );
  typia.assert(versionB);

  TestValidator.equals(
    "version B has expected version_code",
    versionB.version_code,
    versionBCode,
  );

  // 5. Create an initial policy override referencing version A
  const subjectId = typia.random<string & tags.Format<"uuid">>();
  const overrideCode = "max_refund_window";
  const overrideValueA = "7_days";

  const overrideCreateBody = {
    shopping_mall_policy_version_id: versionA.id,
    subject_type: "seller",
    subject_id: subjectId,
    subject_display: `Seller-${RandomGenerator.alphaNumeric(6)}`,
    override_code: overrideCode,
    override_value: overrideValueA,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    effective_from: past.toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const createdOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody,
    });
  typia.assert(createdOverride);

  TestValidator.equals(
    "created override references version A",
    createdOverride.shopping_mall_policy_version_id,
    versionA.id,
  );
  TestValidator.equals(
    "created override subject_type matches input",
    createdOverride.subject_type,
    overrideCreateBody.subject_type,
  );
  TestValidator.equals(
    "created override subject_id matches input",
    createdOverride.subject_id,
    subjectId,
  );
  TestValidator.equals(
    "created override override_code matches input",
    createdOverride.override_code,
    overrideCode,
  );
  TestValidator.equals(
    "created override override_value matches input",
    createdOverride.override_value,
    overrideValueA,
  );
  TestValidator.equals(
    "created override created_by_admin_id matches joined admin id",
    createdOverride.created_by_admin_id,
    adminAuthorized.id,
  );

  // 6. Update the override to point to version B and adjust override_value
  const overrideValueB = "14_days";

  const overrideUpdateBody = {
    shopping_mall_policy_version_id: versionB.id,
    override_value: overrideValueB,
  } satisfies IShoppingMallPolicyOverride.IUpdate;

  const updatedOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.update(connection, {
      policyOverrideId: createdOverride.id,
      body: overrideUpdateBody,
    });
  typia.assert(updatedOverride);

  // 7. Validate reassignment and invariants
  TestValidator.equals(
    "updated override now references version B",
    updatedOverride.shopping_mall_policy_version_id,
    versionB.id,
  );
  TestValidator.equals(
    "updated override keeps same subject_type",
    updatedOverride.subject_type,
    createdOverride.subject_type,
  );
  TestValidator.equals(
    "updated override keeps same subject_id",
    updatedOverride.subject_id,
    createdOverride.subject_id,
  );
  TestValidator.equals(
    "updated override keeps same override_code",
    updatedOverride.override_code,
    createdOverride.override_code,
  );
  TestValidator.equals(
    "updated override has new override_value",
    updatedOverride.override_value,
    overrideValueB,
  );
  TestValidator.equals(
    "updated override keeps same created_by_admin_id",
    updatedOverride.created_by_admin_id,
    createdOverride.created_by_admin_id,
  );

  // created_at should remain stable; updated_at should reflect change (likely different)
  TestValidator.equals(
    "updated override has same created_at as initial override",
    updatedOverride.created_at,
    createdOverride.created_at,
  );

  // We don't strictly require updated_at to differ, but we can at least assert it's a non-empty string
  TestValidator.predicate(
    "updated override has a non-empty updated_at",
    updatedOverride.updated_at.length > 0,
  );

  // 8. Optionally verify embedded policyVersion summary reflects version B
  if (updatedOverride.policyVersion !== undefined) {
    TestValidator.equals(
      "embedded policyVersion id matches version B id",
      updatedOverride.policyVersion.id,
      versionB.id,
    );
    TestValidator.equals(
      "embedded policyVersion.version_code matches version B code",
      updatedOverride.policyVersion.version_code,
      versionBCode,
    );
  }
}
