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
 * Verify that creating a case SLA configuration with a non-existent
 * shopping_mall_business_policy_version_id is rejected, and that valid
 * configurations without such an invalid reference still succeed.
 *
 * Business context:
 *
 * - Case SLA configs are admin-managed rules that may optionally be tied to a
 *   concrete business policy version.
 * - When a policy version id is provided, it must refer to an existing row in
 *   shopping_mall_policy_versions; otherwise the API must reject the request
 *   instead of silently accepting a dangling foreign key.
 * - Only admins can create SLA configs; join will both create an admin account
 *   and establish the authenticated context for subsequent calls.
 *
 * Steps:
 *
 * 1. Create an admin via POST /auth/admin/join so that the connection carries a
 *    valid admin token for subsequent calls.
 * 2. Generate a random UUID value to represent a non-existent policy version id.
 * 3. Build a valid IShoppingMallCaseSlaConfig.ICreate body with that UUID in
 *    shopping_mall_business_policy_version_id and otherwise valid SLA fields.
 * 4. Call api.functional.shoppingMall.admin.caseSlaConfigs.create with that body
 *    and expect it to fail, using TestValidator.error.
 * 5. Build a second, valid IShoppingMallCaseSlaConfig.ICreate body that sets
 *    shopping_mall_business_policy_version_id explicitly to null, keeping other
 *    fields valid.
 * 6. Call the same create endpoint with the valid body, assert success and
 *    validate the response type with typia.assert, and check that it is not
 *    associated to any policy version (null/undefined).
 */
export async function test_api_case_sla_config_creation_rejects_invalid_policy_version(
  connection: api.IConnection,
) {
  // 1. Create an admin to establish an authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Generate a random UUID to act as a non-existent policy version id.
  const invalidPolicyVersionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build an SLA config body that references the invalid policy version id.
  const invalidSlaBody = {
    shopping_mall_business_policy_version_id: invalidPolicyVersionId,
    case_type: "refund",
    actor_role: "seller",
    action_type: "initial_response",
    target_duration_seconds: (24 * 60 * 60) as number & tags.Type<"int32">,
    warning_duration_seconds: (12 * 60 * 60) as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  // 4. Expect the create call to fail due to invalid foreign key reference.
  await TestValidator.error(
    "creating SLA config with non-existent policy version id should fail",
    async () => {
      await api.functional.shoppingMall.admin.caseSlaConfigs.create(
        connection,
        {
          body: invalidSlaBody,
        },
      );
    },
  );

  // 5. Build a valid SLA config body with no associated policy version.
  const validSlaBody = {
    shopping_mall_business_policy_version_id: null,
    case_type: "refund",
    actor_role: "seller",
    action_type: "final_decision",
    target_duration_seconds: (48 * 60 * 60) as number & tags.Type<"int32">,
    warning_duration_seconds: null,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  // 6. Call create with the valid body and assert success and type.
  const createdConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: validSlaBody,
    });
  typia.assert(createdConfig);

  TestValidator.equals(
    "created SLA config should reflect is_active flag",
    createdConfig.is_active,
    validSlaBody.is_active,
  );

  // PolicyVersion should be effectively absent when the FK is null
  await TestValidator.predicate(
    "created SLA config should not be associated with any policy version when FK is null",
    async () =>
      createdConfig.policyVersion === null ||
      createdConfig.policyVersion === undefined,
  );
}
