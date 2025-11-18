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
 * Validate creating a global case SLA configuration without binding to any
 * business policy version.
 *
 * Business intent
 *
 * - Ensure an authenticated admin can register a case SLA configuration via POST
 *   /shoppingMall/admin/caseSlaConfigs without specifying a
 *   shopping_mall_business_policy_version_id, effectively creating a "global"
 *   SLA rule that is not tied to a specific business policy version.
 * - Verify that the returned IShoppingMallCaseSlaConfig mirrors the request
 *   payload fields and exposes a null/empty policyVersion association.
 *
 * Steps
 *
 * 1. Join as a new admin through POST /auth/admin/join to obtain an authenticated
 *    admin context. The SDK will automatically attach the Authorization header
 *    to the given connection.
 * 2. Call POST /shoppingMall/admin/caseSlaConfigs with an
 *    IShoppingMallCaseSlaConfig.ICreate body where
 *    shopping_mall_business_policy_version_id is explicitly null and the other
 *    SLA fields are filled with valid values.
 * 3. Validate the created IShoppingMallCaseSlaConfig:
 *
 *    - Fields case_type, actor_role, action_type, target_duration_seconds,
 *         warning_duration_seconds, and is_active match the request body.
 *    - Id, created_at, and updated_at are populated (type-validated by
 *         typia.assert).
 *    - PolicyVersion is effectively "no association" (null or undefined), proving
 *         that SLA configs can exist independently of policy versions.
 */
export async function test_api_case_sla_config_creation_without_policy_version(
  connection: api.IConnection,
) {
  // 1. Admin join/authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create SLA config without policy version
  const targetDurationSeconds = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const warningDurationSeconds = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const createBody = {
    shopping_mall_business_policy_version_id: null,
    case_type: "cancellation",
    actor_role: "seller",
    action_type: "initial_response",
    target_duration_seconds: targetDurationSeconds,
    warning_duration_seconds: warningDurationSeconds,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const created: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3. Validate response semantics
  TestValidator.equals(
    "case_type should match request",
    created.case_type,
    createBody.case_type,
  );
  TestValidator.equals(
    "actor_role should match request",
    created.actor_role,
    createBody.actor_role,
  );
  TestValidator.equals(
    "action_type should match request",
    created.action_type,
    createBody.action_type,
  );
  TestValidator.equals(
    "target_duration_seconds should match request",
    created.target_duration_seconds,
    createBody.target_duration_seconds,
  );
  TestValidator.equals(
    "warning_duration_seconds should match request",
    created.warning_duration_seconds ?? null,
    createBody.warning_duration_seconds ?? null,
  );
  TestValidator.equals(
    "is_active should match request",
    created.is_active,
    createBody.is_active,
  );

  // policyVersion should be effectively null/absent when created without a policy version id
  TestValidator.equals(
    "policyVersion should be null when created without policy version id",
    created.policyVersion ?? null,
    null,
  );

  // Basic sanity: id should be a non-empty UUID string (typia.assert already checks format)
  TestValidator.predicate(
    "created SLA config must have a non-empty id",
    created.id.length > 0,
  );
}
