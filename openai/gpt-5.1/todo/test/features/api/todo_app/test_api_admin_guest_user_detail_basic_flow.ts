import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate that an authenticated admin can retrieve a specific guest user
 * concept record by UUID using the admin-only guestUsers detail endpoint.
 *
 * Business context:
 *
 * - Admin users are registered via /auth/adminUser/join, which also issues JWT
 *   tokens encapsulated in ITodoAppAdminUser.IAuthorized and automatically
 *   propagated into the SDK connection headers.
 * - System-level configuration is managed via /todoApp/adminUser/systemSettings
 *   and must be initialized before certain diagnostic or analytics endpoints
 *   are used.
 * - Guest users are modeled as anonymous or transient actors stored in
 *   todo_app_guestusers and surfaced via ITodoAppGuestUser for admin-only
 *   inspection and troubleshooting.
 *
 * This test exercises the happy-path flow:
 *
 * 1. Join an admin user and establish admin authentication.
 * 2. Create at least one system setting as a prerequisite for system
 *    configuration.
 * 3. Call GET /todoApp/adminUser/guestUsers/{guestUserId} as an admin with a UUID
 *    path parameter.
 * 4. Validate that the response conforms to ITodoAppGuestUser and that the id
 *    matches the UUID used in the path.
 *
 * Error and negative authorization paths (e.g., 404 for unknown UUID, non-admin
 * access) are intentionally not covered here due to API surface and test
 * environment constraints, and to keep the test focused on the core contract of
 * the admin guest user detail endpoint.
 */
export async function test_api_admin_guest_user_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin registration / authentication
  const adminJoinInput = typia.random<ITodoAppAdminUser.IJoin>();

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Initialize a system setting as prerequisite configuration
  const systemSettingKeyPrefix = "e2e_max_active_todos_per_user_";
  const systemSettingKey =
    systemSettingKeyPrefix + RandomGenerator.alphaNumeric(8);

  const systemSettingCreateBody = {
    key: systemSettingKey,
    value: "100",
    type: "int",
    description: "E2E test system setting for max active todos per user",
    group: "e2e-tests",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert(systemSetting);

  // Basic sanity checks on created system setting
  TestValidator.equals(
    "system setting key should match request",
    systemSetting.key,
    systemSettingCreateBody.key,
  );
  TestValidator.predicate(
    "system setting should be enabled",
    systemSetting.enabled === true,
  );

  // 3. Prepare a guest user id and call the admin guestUsers detail endpoint
  const guestUserId = typia.random<string & tags.Format<"uuid">>();

  const guestUser: ITodoAppGuestUser =
    await api.functional.todoApp.adminUser.guestUsers.at(connection, {
      guestUserId,
    });
  typia.assert(guestUser);

  // 4. Validate response business expectations
  TestValidator.equals(
    "guest user id should match requested guestUserId",
    guestUser.id,
    guestUserId,
  );
  TestValidator.predicate(
    "guest user id should be non-empty",
    guestUser.id.length > 0,
  );
  TestValidator.predicate(
    "guest user created_at should be non-empty",
    guestUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "guest user updated_at should be non-empty",
    guestUser.updated_at.length > 0,
  );
}
