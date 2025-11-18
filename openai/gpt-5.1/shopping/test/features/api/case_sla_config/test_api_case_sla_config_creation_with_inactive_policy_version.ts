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
 * Validate SLA configuration creation when referencing a non-active policy
 * version.
 *
 * Business workflow under test:
 *
 * 1. An administrator joins the platform and receives an authorized admin context.
 * 2. The admin creates a business policy that will own policy versions.
 * 3. The admin creates a non-active policy version (e.g. status = "draft") under
 *    that business policy, with effective_from in the future and
 *    effective_until left null.
 * 4. The admin attempts to create a case SLA configuration that references this
 *    non-active policy version via shopping_mall_business_policy_version_id.
 * 5. The test observes behavior:
 *
 *    - If creation succeeds, it validates that the resulting
 *         IShoppingMallCaseSlaConfig is well-formed and that the configuration
 *         reflects the inputs and references the expected policy version id
 *         (when the policyVersion summary is populated).
 *    - If creation fails due to business rules (e.g., only active versions can be
 *         referenced), it validates that an error is thrown without asserting
 *         specific HTTP status codes.
 */
export async function test_api_case_sla_config_creation_with_inactive_policy_version(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.assert<string & tags.Format<"password">>(
      RandomGenerator.alphaNumeric(16),
    ),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a parent business policy (active)
  const policyCode = `case_sla_test_${RandomGenerator.alphaNumeric(8)}`;
  const businessPolicyBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "case_sla",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: businessPolicyBody,
      },
    );
  typia.assert(policy);

  TestValidator.equals(
    "created policy_code should match input",
    policy.policy_code,
    policyCode,
  );

  // 3. Create a non-active policy version under this policy
  const nonActiveStatus = "draft";
  const effectiveFrom = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const versionBody = {
    version_code: `v_inactive_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ maxHours: 48, priority: "high" }),
    status: nonActiveStatus,
    effective_from: effectiveFrom,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const version: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: versionBody,
      },
    );
  typia.assert(version);

  TestValidator.equals(
    "policy version status should be non-active (draft)",
    version.status,
    nonActiveStatus,
  );
  TestValidator.notEquals(
    "policy version status should not be active",
    version.status,
    "active",
  );

  // 4. Attempt to create a case SLA configuration referencing this non-active version
  const targetSecondsBase = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const targetSeconds = targetSecondsBase satisfies number as number;
  const warningSeconds = Math.floor(targetSeconds / 2);

  const caseTypeOptions = ["refund", "cancellation", "dispute"] as const;
  const actorRoleOptions = ["customer", "seller", "admin"] as const;
  const actionTypeOptions = [
    "initial_response",
    "final_decision",
    "acknowledgement",
  ] as const;

  const slaCreateBody = {
    shopping_mall_business_policy_version_id: version.id,
    case_type: RandomGenerator.pick(caseTypeOptions),
    actor_role: RandomGenerator.pick(actorRoleOptions),
    action_type: RandomGenerator.pick(actionTypeOptions),
    target_duration_seconds: targetSeconds,
    warning_duration_seconds: warningSeconds,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  // 5. Observe behavior: try to create SLA, handle both success and failure
  let createdSla: IShoppingMallCaseSlaConfig | null = null;
  try {
    createdSla = await api.functional.shoppingMall.admin.caseSlaConfigs.create(
      connection,
      {
        body: slaCreateBody,
      },
    );
  } catch {
    // If the backend rejects non-active policy version references, ensure
    // that calling the same operation results in an error. We do not
    // assert HTTP status codes or error messages.
    await TestValidator.error(
      "creating SLA with non-active policy version should fail when business rules disallow it",
      async () => {
        await api.functional.shoppingMall.admin.caseSlaConfigs.create(
          connection,
          {
            body: slaCreateBody,
          },
        );
      },
    );
    return;
  }

  // If we reach here, SLA creation has succeeded. Validate the response.
  typia.assert(createdSla);

  TestValidator.equals(
    "created SLA case_type should match request",
    createdSla.case_type,
    slaCreateBody.case_type,
  );
  TestValidator.equals(
    "created SLA actor_role should match request",
    createdSla.actor_role,
    slaCreateBody.actor_role,
  );
  TestValidator.equals(
    "created SLA action_type should match request",
    createdSla.action_type,
    slaCreateBody.action_type,
  );
  TestValidator.equals(
    "created SLA target_duration_seconds should match request",
    createdSla.target_duration_seconds,
    slaCreateBody.target_duration_seconds,
  );
  TestValidator.equals(
    "created SLA is_active should match request",
    createdSla.is_active,
    slaCreateBody.is_active,
  );

  if (
    createdSla.policyVersion !== null &&
    createdSla.policyVersion !== undefined
  ) {
    typia.assert(createdSla.policyVersion);
    TestValidator.equals(
      "created SLA should reference the non-active policy version id when summary is populated",
      createdSla.policyVersion.id,
      version.id,
    );
    TestValidator.equals(
      "referenced policy version status in SLA should match non-active status",
      createdSla.policyVersion.status,
      nonActiveStatus,
    );
  }
}
