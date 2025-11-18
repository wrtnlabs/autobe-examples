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
 * Validate that an authenticated admin can update basic SLA configuration
 * fields on an existing case SLA configuration while preserving identity and
 * policy version linkage.
 *
 * Business context:
 *
 * - Case SLA configurations live under shopping_mall_case_sla_configs and are
 *   managed only by admins.
 * - An admin must first exist and be authenticated (POST /auth/admin/join), which
 *   also wires Authorization headers automatically via the SDK.
 * - SLA configs may be associated to a concrete business policy version so that
 *   governance can track which policy text defined the SLA expectations.
 *
 * Test steps:
 *
 * 1. Join an admin using api.functional.auth.admin.join with a concrete
 *    IShoppingMallAdminJoin.ICreate payload (random but valid email, password,
 *    href, referrer, and optional ip).
 * 2. Using the authenticated admin connection, create a base business policy via
 *    api.functional.shoppingMall.admin.businessPolicies.create, with a unique
 *    policy_code and is_active=true, plus reasonable
 *    name/category/description.
 * 3. Under that policy, create a first active policy version via
 *    api.functional.shoppingMall.admin.businessPolicies.versions.create, with
 *    status="active", a valid version_code, title, markdown body, and an
 *    effective_from date-time (e.g., now).
 * 4. Create an initial case SLA configuration via
 *    api.functional.shoppingMall.admin.caseSlaConfigs.create. The
 *    IShoppingMallCaseSlaConfig.ICreate body must:
 *
 *    - Reference the policy version id through
 *         shopping_mall_business_policy_version_id,
 *    - Set initial case_type, actor_role, action_type strings,
 *    - Set target_duration_seconds to some positive int32,
 *    - Set a non-null warning_duration_seconds,
 *    - Set is_active=true. Capture the returned IShoppingMallCaseSlaConfig, assert
 *         it with typia.assert, and store its id and policyVersion.id for later
 *         comparison.
 * 5. Call api.functional.shoppingMall.admin.caseSlaConfigs.update with
 *    caseSlaConfigId equal to the created config id and a
 *    IShoppingMallCaseSlaConfig.IUpdate body that changes multiple fields:
 *
 *    - Increase target_duration_seconds,
 *    - Change warning_duration_seconds (e.g., from non-null to another value or to
 *         null),
 *    - Toggle is_active from true to false,
 *    - Optionally tweak case_type or actor_role or action_type to demonstrate that
 *         these fields can be updated as well.
 * 6. Assert the response type using typia.assert and then compare the updated
 *    IShoppingMallCaseSlaConfig against the original:
 *
 *    - Id is identical to the original config id,
 *    - PolicyVersion is still non-null (if original had it) and its id equals the
 *         original policyVersion.id,
 *    - Updated target_duration_seconds equals the new value and differs from the
 *         original value,
 *    - Updated warning_duration_seconds reflects the new value (including null
 *         case),
 *    - Is_active changed from true to false,
 *    - Where modified, case_type/actor_role/action_type reflect new strings and
 *         differ from the original ones.
 * 7. Do not touch connection.headers manually—authorization is already handled by
 *    the join call.
 */
export async function test_api_case_sla_config_update_basic_fields_by_admin(
  connection: api.IConnection,
) {
  // 1. Join admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create business policy
  const policyCode = `case-sla-${RandomGenerator.alphaNumeric(8)}`;
  const policyBody = {
    policy_code: policyCode,
    name: "Case SLA Policy",
    category: "case_sla",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: policyBody },
    );
  typia.assert(policy);

  // 3. Create active policy version
  const nowIso = new Date().toISOString();
  const versionBody = {
    version_code: "v1",
    title: "Initial Case SLA Policy Version",
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
        body: versionBody,
      },
    );
  typia.assert(policyVersion);

  // 4. Create initial case SLA config
  const initialTargetSeconds = 3600 as number & tags.Type<"int32">;
  const initialWarningSeconds = 1800 as number & tags.Type<"int32">;

  const slaCreateBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "refund",
    actor_role: "seller",
    action_type: "initial_response",
    target_duration_seconds: initialTargetSeconds,
    warning_duration_seconds: initialWarningSeconds,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const createdSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaCreateBody,
    });
  typia.assert(createdSla);

  const originalId = createdSla.id;
  const originalPolicyVersionId = createdSla.policyVersion?.id ?? null;

  // 5. Update SLA config basic fields
  const updatedTargetSeconds = (initialTargetSeconds + 1200) as number &
    tags.Type<"int32">;
  const updatedWarningSeconds = null;

  const slaUpdateBody = {
    case_type: "refund_adjusted",
    actor_role: "seller_case_team",
    action_type: "initial_response_review",
    target_duration_seconds: updatedTargetSeconds,
    warning_duration_seconds: updatedWarningSeconds,
    is_active: false,
    shopping_mall_business_policy_version_id: originalPolicyVersionId,
  } satisfies IShoppingMallCaseSlaConfig.IUpdate;

  const updatedSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.update(connection, {
      caseSlaConfigId: originalId,
      body: slaUpdateBody,
    });
  typia.assert(updatedSla);

  // 6. Business assertions
  TestValidator.equals(
    "SLA config id should remain unchanged after update",
    updatedSla.id,
    originalId,
  );

  if (originalPolicyVersionId !== null) {
    TestValidator.predicate(
      "Updated SLA should preserve policyVersion when originally set",
      !!updatedSla.policyVersion &&
        updatedSla.policyVersion.id === originalPolicyVersionId,
    );
  }

  TestValidator.equals(
    "target_duration_seconds should be updated",
    updatedSla.target_duration_seconds,
    updatedTargetSeconds,
  );
  TestValidator.notEquals(
    "target_duration_seconds should differ from original",
    updatedSla.target_duration_seconds,
    createdSla.target_duration_seconds,
  );

  TestValidator.equals(
    "warning_duration_seconds should reflect updated null value",
    updatedSla.warning_duration_seconds,
    updatedWarningSeconds,
  );

  TestValidator.equals(
    "is_active should be toggled to false",
    updatedSla.is_active,
    false,
  );

  TestValidator.notEquals(
    "case_type should change after update",
    updatedSla.case_type,
    createdSla.case_type,
  );
  TestValidator.notEquals(
    "actor_role should change after update",
    updatedSla.actor_role,
    createdSla.actor_role,
  );
  TestValidator.notEquals(
    "action_type should change after update",
    updatedSla.action_type,
    createdSla.action_type,
  );
}
