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
 * Validate that case SLA config detail reflects inactive status changes.
 *
 * Business context: Admins define SLA rules for different case types (e.g.,
 * refunds, disputes) using case SLA configurations. Each configuration can be
 * activated or deactivated over time, and is often tied to a specific business
 * policy version. The detail endpoint must always reflect the current
 * activation status and updated audit timestamps so governance users can trust
 * what they see when inspecting a configuration.
 *
 * This test performs a full admin workflow:
 *
 * 1. Register a new admin using POST /auth/admin/join to obtain an authenticated
 *    admin context via the SDK (token wiring is automatic).
 * 2. As that admin, create a business policy definition via POST
 *    /shoppingMall/admin/businessPolicies using
 *    IShoppingMallBusinessPolicy.ICreate.
 * 3. Under that policy, create an active-like policy version via POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions using
 *    IShoppingMallPolicyVersion.ICreate with status set to a non-empty string
 *    (e.g., "active").
 * 4. Create a case SLA configuration via POST /shoppingMall/admin/caseSlaConfigs
 *    using IShoppingMallCaseSlaConfig.ICreate, setting:
 *
 *    - Shopping_mall_business_policy_version_id to the created policyVersion.id
 *    - Case_type, actor_role, action_type to arbitrary, but consistent string codes
 *    - Target_duration_seconds to a positive int32 value
 *    - Warning_duration_seconds to a smaller or equal int32 or null
 *    - Is_active to true
 * 5. Call GET /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId} via
 *    api.functional.shoppingMall.admin.caseSlaConfigs.at using the created SLA
 *    config id. Use typia.assert to validate the response type, then use
 *    TestValidator to confirm:
 *
 *    - Is_active is true
 *    - Id, case_type, actor_role, action_type, target_duration_seconds match the
 *         created record
 *    - PolicyVersion is either null/undefined or, if present, has id equal to the
 *         policyVersion.id used when creating
 * 6. Update the SLA configuration via PUT
 *    /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId} using
 *    IShoppingMallCaseSlaConfig.IUpdate as body with only is_active set to
 *    false. Capture updated_at from the response as updatedUpdatedAt.
 * 7. Call GET /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId} again. Use
 *    typia.assert on the new response, then assert using TestValidator that:
 *
 *    - Is_active is now false
 *    - Id, case_type, actor_role, action_type, target_duration_seconds are unchanged
 *         compared to the original response from step 5
 *    - Updated_at is greater than the original updated_at from step 5 (string
 *         comparison after converting to Date objects).
 *
 * Implementation notes:
 *
 * - Use typia.random<...>() with appropriate tag constraints for generating
 *   email, URI fields, UUIDs, and numeric int32 values.
 * - Request bodies must use `satisfies` with the correct DTO variants:
 *
 *   - IShoppingMallAdminJoin.ICreate for admin join.
 *   - IShoppingMallBusinessPolicy.ICreate for policy creation.
 *   - IShoppingMallPolicyVersion.ICreate for version creation.
 *   - IShoppingMallCaseSlaConfig.ICreate for SLA creation.
 *   - IShoppingMallCaseSlaConfig.IUpdate for SLA update.
 * - Always call typia.assert(response) immediately after each API call that
 *   returns a non-void response.
 * - Use TestValidator.equals with descriptive titles and pass the actual value as
 *   the second parameter and expected as the third.
 */
export async function test_api_case_sla_config_detail_reflects_inactive_status_change(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authenticated admin context
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

  // 2. Create a business policy
  const policyCode: string = RandomGenerator.alphaNumeric(12);
  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.name(),
    category: "sla", // arbitrary category string
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
    "created policy_code should match input",
    policy.policy_code,
    policyCode,
  );

  // 3. Create an active-like policy version under that policy
  const versionCode: string = "v1";
  const versionCreateBody = {
    version_code: versionCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: null,
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
    "created policy version_code should match input",
    policyVersion.version_code,
    versionCode,
  );

  // 4. Create an active SLA configuration referencing the policy version
  const caseType = "refund";
  const actorRole = "seller";
  const actionType = "initial_response";
  const targetDurationSeconds: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const warningDurationSeconds: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const slaCreateBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: caseType,
    actor_role: actorRole,
    action_type: actionType,
    target_duration_seconds: targetDurationSeconds,
    warning_duration_seconds: warningDurationSeconds,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const createdSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaCreateBody,
    });
  typia.assert(createdSla);

  TestValidator.equals(
    "created SLA is_active should be true",
    createdSla.is_active,
    true,
  );
  TestValidator.equals(
    "created SLA case_type should match",
    createdSla.case_type,
    caseType,
  );
  TestValidator.equals(
    "created SLA actor_role should match",
    createdSla.actor_role,
    actorRole,
  );
  TestValidator.equals(
    "created SLA action_type should match",
    createdSla.action_type,
    actionType,
  );
  TestValidator.equals(
    "created SLA target_duration_seconds should match",
    createdSla.target_duration_seconds,
    targetDurationSeconds,
  );

  if (
    createdSla.policyVersion !== null &&
    createdSla.policyVersion !== undefined
  ) {
    TestValidator.equals(
      "created SLA policyVersion.id should match created policyVersion.id",
      createdSla.policyVersion.id,
      policyVersion.id,
    );
  }

  // 5. Initial detail fetch
  const initialDetail: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.at(connection, {
      caseSlaConfigId: createdSla.id,
    });
  typia.assert(initialDetail);

  TestValidator.equals(
    "detail SLA id should match created id",
    initialDetail.id,
    createdSla.id,
  );
  TestValidator.equals(
    "detail SLA is_active should initially be true",
    initialDetail.is_active,
    true,
  );
  TestValidator.equals(
    "detail SLA case_type should match created value",
    initialDetail.case_type,
    createdSla.case_type,
  );
  TestValidator.equals(
    "detail SLA actor_role should match created value",
    initialDetail.actor_role,
    createdSla.actor_role,
  );
  TestValidator.equals(
    "detail SLA action_type should match created value",
    initialDetail.action_type,
    createdSla.action_type,
  );
  TestValidator.equals(
    "detail SLA target_duration_seconds should match created value",
    initialDetail.target_duration_seconds,
    createdSla.target_duration_seconds,
  );

  if (
    initialDetail.policyVersion !== null &&
    initialDetail.policyVersion !== undefined &&
    createdSla.policyVersion !== null &&
    createdSla.policyVersion !== undefined
  ) {
    TestValidator.equals(
      "detail SLA policyVersion.id should match created policyVersion.id",
      initialDetail.policyVersion.id,
      createdSla.policyVersion.id,
    );
  }

  const initialUpdatedAt = new Date(initialDetail.updated_at).getTime();

  // 6. Update SLA to set is_active=false
  const slaUpdateBody = {
    is_active: false,
  } satisfies IShoppingMallCaseSlaConfig.IUpdate;

  const updatedSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.update(connection, {
      caseSlaConfigId: createdSla.id,
      body: slaUpdateBody,
    });
  typia.assert(updatedSla);

  TestValidator.equals(
    "updated SLA is_active should be false",
    updatedSla.is_active,
    false,
  );

  const updatedUpdatedAt = new Date(updatedSla.updated_at).getTime();

  TestValidator.predicate(
    "updated updated_at should be later than initial updated_at",
    updatedUpdatedAt > initialUpdatedAt,
  );

  // 7. Fetch detail again to confirm changes reflected
  const finalDetail: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.at(connection, {
      caseSlaConfigId: createdSla.id,
    });
  typia.assert(finalDetail);

  TestValidator.equals(
    "final detail SLA id should remain the same",
    finalDetail.id,
    initialDetail.id,
  );
  TestValidator.equals(
    "final detail SLA is_active should be false after update",
    finalDetail.is_active,
    false,
  );
  TestValidator.equals(
    "final detail SLA case_type should remain unchanged",
    finalDetail.case_type,
    initialDetail.case_type,
  );
  TestValidator.equals(
    "final detail SLA actor_role should remain unchanged",
    finalDetail.actor_role,
    initialDetail.actor_role,
  );
  TestValidator.equals(
    "final detail SLA action_type should remain unchanged",
    finalDetail.action_type,
    initialDetail.action_type,
  );
  TestValidator.equals(
    "final detail SLA target_duration_seconds should remain unchanged",
    finalDetail.target_duration_seconds,
    initialDetail.target_duration_seconds,
  );

  const finalUpdatedAt = new Date(finalDetail.updated_at).getTime();
  TestValidator.predicate(
    "final detail updated_at should be at least as recent as updatedSla.updated_at",
    finalUpdatedAt >= updatedUpdatedAt,
  );
}
