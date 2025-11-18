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
 * Validate that an admin can delete a case SLA configuration after deactivating
 * it.
 *
 * Business goal
 *
 * - Ensure lifecycle operations on ShoppingMall case SLA configurations support
 *   the sequence: create (active) -> update (inactive) -> delete.
 * - Confirm that deactivation (is_active=false) does not block subsequent hard
 *   deletion via the admin erase endpoint.
 *
 * High-level steps
 *
 * 1. Join as an admin using POST /auth/admin/join.
 *
 *    - This will both create an admin account and set the Authorization header on
 *         the provided connection via the SDK.
 * 2. Create an active SLA configuration using POST
 *    /shoppingMall/admin/caseSlaConfigs with is_active=true.
 *
 *    - Use realistic, deterministic values for case_type, actor_role, action_type
 *         and numeric durations.
 * 3. Deactivate the configuration using PUT
 *    /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId}.
 *
 *    - Send a partial IShoppingMallCaseSlaConfig.IUpdate body with is_active=false.
 *    - Validate via typia.assert that the returned entity now has is_active ===
 *         false and the same id as the created one.
 * 4. Delete the configuration using DELETE
 *    /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId}.
 *
 *    - Call api.functional.shoppingMall.admin.caseSlaConfigs.erase and ensure it
 *         completes without throwing.
 * 5. Business assertions
 *
 *    - The created config must be active initially (is_active === true).
 *    - The updated config must be inactive (is_active === false).
 *    - The delete call should succeed without error; we do not inspect status codes,
 *         only that the operation completes.
 */
export async function test_api_case_sla_config_delete_after_deactivation(
  connection: api.IConnection,
) {
  // 1. Join as an admin (authentication + token installation on connection)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an active SLA configuration
  const createBody = {
    shopping_mall_business_policy_version_id: null,
    case_type: "refund",
    actor_role: "seller",
    action_type: "initial_response",
    target_duration_seconds: 48 * 60 * 60, // 48 hours
    warning_duration_seconds: 24 * 60 * 60, // 24 hours before breach
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const created: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Basic business sanity checks for the created config
  TestValidator.predicate(
    "created SLA config should be active",
    created.is_active === true,
  );
  TestValidator.equals(
    "created SLA config case_type should match request",
    created.case_type,
    createBody.case_type,
  );
  TestValidator.equals(
    "created SLA config actor_role should match request",
    created.actor_role,
    createBody.actor_role,
  );
  TestValidator.equals(
    "created SLA config action_type should match request",
    created.action_type,
    createBody.action_type,
  );

  // 3. Deactivate the configuration via update
  const updateBody = {
    is_active: false,
  } satisfies IShoppingMallCaseSlaConfig.IUpdate;

  const updated: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.update(connection, {
      caseSlaConfigId: created.id,
      body: updateBody,
    });
  typia.assert(updated);

  // Verify lifecycle state transition to inactive
  TestValidator.equals(
    "updated SLA config id should remain the same",
    updated.id,
    created.id,
  );
  TestValidator.predicate(
    "updated SLA config should be inactive",
    updated.is_active === false,
  );

  // 4. Delete the configuration
  await api.functional.shoppingMall.admin.caseSlaConfigs.erase(connection, {
    caseSlaConfigId: created.id,
  });

  // If we reach here without an exception, deletion has succeeded from the
  // test perspective. No additional assertions are needed as erase returns
  // void and typia.assert(void) is not meaningful.
}
