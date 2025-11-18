import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate creation of a case SLA configuration bound to a specific active
 * business policy version.
 *
 * Business context:
 *
 * - Admins manage governance rules through business policies and versioned policy
 *   documents.
 * - Case SLA configurations should be attached to concrete policy versions so
 *   that support and risk engines know which rule set defined the SLA
 *   expectations at a given time.
 *
 * This test exercises the happy-path workflow:
 *
 * 1. Register and authenticate an admin via POST /auth/admin/join.
 * 2. As that admin, create a business policy via POST
 *    /shoppingMall/admin/businessPolicies.
 * 3. Under that policy, create an active policy version via POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions.
 * 4. Create a case SLA configuration via POST /shoppingMall/admin/caseSlaConfigs
 *    that links to the created policy version using
 *    shopping_mall_business_policy_version_id.
 * 5. Verify that the response echoes the configured SLA fields and that the
 *    embedded policyVersion summary matches the created version and its parent
 *    policy.
 */
export async function test_api_case_sla_config_creation_with_policy_version(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy under this admin context.
  const policyCode: string = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert(policy);

  TestValidator.equals(
    "business policy code should match request",
    policy.policy_code,
    policyCreateBody.policy_code,
  );

  // 3. Create an active version for this policy.
  const versionCode: string = `v_${RandomGenerator.alphaNumeric(6)}`;
  const nowIso = new Date().toISOString();
  const policyVersionCreateBody = {
    version_code: versionCode,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policyCode,
        body: policyVersionCreateBody,
      },
    );
  typia.assert(policyVersion);

  TestValidator.equals(
    "policy version code should match request",
    policyVersion.version_code,
    policyVersionCreateBody.version_code,
  );

  // 4. Create a case SLA configuration linked to the created policy version.
  const slaCreateBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "refund",
    actor_role: RandomGenerator.pick(["customer", "seller"] as const),
    action_type: "initial_response",
    target_duration_seconds: 7200,
    warning_duration_seconds: 3600,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaCreateBody,
    });
  typia.assert(slaConfig);

  // 5. Validate SLA creation response mirrors request fields.
  TestValidator.equals(
    "SLA case_type should mirror request",
    slaConfig.case_type,
    slaCreateBody.case_type,
  );
  TestValidator.equals(
    "SLA actor_role should mirror request",
    slaConfig.actor_role,
    slaCreateBody.actor_role,
  );
  TestValidator.equals(
    "SLA action_type should mirror request",
    slaConfig.action_type,
    slaCreateBody.action_type,
  );
  TestValidator.equals(
    "SLA target_duration_seconds should mirror request",
    slaConfig.target_duration_seconds,
    slaCreateBody.target_duration_seconds,
  );
  TestValidator.equals(
    "SLA warning_duration_seconds should mirror request",
    slaConfig.warning_duration_seconds ?? null,
    slaCreateBody.warning_duration_seconds ?? null,
  );
  TestValidator.equals(
    "SLA is_active should mirror request",
    slaConfig.is_active,
    slaCreateBody.is_active,
  );

  // Audit fields basic sanity: typia.assert already validates formats.
  TestValidator.predicate(
    "SLA id should be a non-empty string",
    typeof slaConfig.id === "string" && slaConfig.id.length > 0,
  );
  TestValidator.predicate(
    "SLA created_at should be a non-empty string",
    typeof slaConfig.created_at === "string" && slaConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "SLA updated_at should be a non-empty string",
    typeof slaConfig.updated_at === "string" && slaConfig.updated_at.length > 0,
  );

  // Policy linkage: policyVersion summary should be present and aligned.
  TestValidator.predicate(
    "SLA should embed a policyVersion summary",
    slaConfig.policyVersion !== null && slaConfig.policyVersion !== undefined,
  );

  if (
    slaConfig.policyVersion !== null &&
    slaConfig.policyVersion !== undefined
  ) {
    const policyVersionSummary = slaConfig.policyVersion;

    TestValidator.equals(
      "policyVersion.id should match created policy version id",
      policyVersionSummary.id,
      policyVersion.id,
    );
    TestValidator.equals(
      "policyVersion.version_code should match created version_code",
      policyVersionSummary.version_code,
      policyVersion.version_code,
    );

    TestValidator.predicate(
      "policyVersion.policy summary should be defined",
      policyVersionSummary.policy !== undefined &&
        policyVersionSummary.policy !== null,
    );

    if (
      policyVersionSummary.policy !== undefined &&
      policyVersionSummary.policy !== null
    ) {
      TestValidator.equals(
        "policyVersion.policy.code should match business policy policy_code",
        policyVersionSummary.policy.code,
        policy.policy_code,
      );
    }
  }
}
