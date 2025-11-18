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
 * Verify that an admin can tighten SLA thresholds on an existing case SLA
 * configuration.
 *
 * Business goal
 *
 * - Ensure that the admin-facing configuration API allows decreasing
 *   target_duration_seconds and warning_duration_seconds for a case SLA rule
 *   while keeping other attributes unchanged.
 * - Confirm that positive, logically consistent tighter thresholds are accepted
 *   by the backend and reflected in the returned entity.
 *
 * Steps
 *
 * 1. Join as an admin via POST /auth/admin/join to establish an authenticated
 *    admin context (SDK automatically injects Authorization header).
 * 2. Create a baseline SLA configuration via POST
 *    /shoppingMall/admin/caseSlaConfigs with generous thresholds (e.g., 72
 *    hours target, 48 hours warning) and is_active=true.
 * 3. Call PUT /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId} using the id
 *    from step 2 and a body that tightens the thresholds (e.g., 24 hours
 *    target, 12 hours warning) while omitting other fields so they remain
 *    unchanged.
 * 4. Validate that the update succeeds and that the updated entity:
 *
 *    - Has the same id as the original configuration.
 *    - Preserves case_type, actor_role, action_type, is_active, policyVersion, and
 *         created_at.
 *    - Has target_duration_seconds and warning_duration_seconds equal to the tighter
 *         values requested.
 *    - Has an updated_at value that differs from the original.
 * 5. Assert that warning_duration_seconds remains lower than
 *    target_duration_seconds after the update as a domain sanity check.
 */
export async function test_api_case_sla_config_update_tighten_thresholds(
  connection: api.IConnection,
) {
  // 1. Join as admin to establish authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a baseline SLA configuration with generous thresholds
  const baselineTargetSeconds = 72 * 60 * 60; // 72 hours
  const baselineWarningSeconds = 48 * 60 * 60; // 48 hours

  const createBody = {
    case_type: "refund",
    actor_role: "seller",
    action_type: "initial_response",
    target_duration_seconds: baselineTargetSeconds,
    warning_duration_seconds: baselineWarningSeconds,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const originalConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(originalConfig);

  // 3. Update the configuration with tighter thresholds only
  const tightenedTargetSeconds = 24 * 60 * 60; // 24 hours
  const tightenedWarningSeconds = 12 * 60 * 60; // 12 hours

  const updateBody = {
    target_duration_seconds: tightenedTargetSeconds,
    warning_duration_seconds: tightenedWarningSeconds,
  } satisfies IShoppingMallCaseSlaConfig.IUpdate;

  const updatedConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.update(connection, {
      caseSlaConfigId: originalConfig.id,
      body: updateBody,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(updatedConfig);

  // 4. Validate identity and unchanged fields
  TestValidator.equals(
    "SLA config id should remain the same after update",
    updatedConfig.id,
    originalConfig.id,
  );

  TestValidator.equals(
    "case_type should remain unchanged after update",
    updatedConfig.case_type,
    originalConfig.case_type,
  );

  TestValidator.equals(
    "actor_role should remain unchanged after update",
    updatedConfig.actor_role,
    originalConfig.actor_role,
  );

  TestValidator.equals(
    "action_type should remain unchanged after update",
    updatedConfig.action_type,
    originalConfig.action_type,
  );

  TestValidator.equals(
    "is_active should remain unchanged after update",
    updatedConfig.is_active,
    originalConfig.is_active,
  );

  TestValidator.equals(
    "policyVersion relationship should remain unchanged after update",
    updatedConfig.policyVersion,
    originalConfig.policyVersion,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedConfig.created_at,
    originalConfig.created_at,
  );

  TestValidator.notEquals(
    "updated_at should change after updating SLA config",
    updatedConfig.updated_at,
    originalConfig.updated_at,
  );

  // 5. Validate tightened thresholds
  TestValidator.equals(
    "target_duration_seconds should be updated to tightened value",
    updatedConfig.target_duration_seconds,
    tightenedTargetSeconds,
  );

  TestValidator.equals(
    "warning_duration_seconds should be updated to tightened value",
    updatedConfig.warning_duration_seconds,
    tightenedWarningSeconds,
  );

  await TestValidator.predicate(
    "warning_duration_seconds should remain less than target_duration_seconds",
    async () =>
      updatedConfig.warning_duration_seconds !== null &&
      updatedConfig.warning_duration_seconds !== undefined &&
      updatedConfig.warning_duration_seconds <
        updatedConfig.target_duration_seconds,
  );
}
