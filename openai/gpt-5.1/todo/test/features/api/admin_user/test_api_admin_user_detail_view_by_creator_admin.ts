import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate that an admin user can view another admin user's detailed profile.
 *
 * Business context:
 *
 * - Admin users operate the todoApp backend and are registered via
 *   /auth/adminUser/join.
 * - Admin-only management endpoints such as system settings and admin user detail
 *   views require an authenticated "adminUser" actor.
 * - For security, admin detail responses must expose only non-sensitive fields
 *   (no password_hash), but must provide id, email, display_name, status, and
 *   audit timestamps.
 *
 * End-to-end flow:
 *
 * 1. Register Admin A using POST /auth/adminUser/join.
 * 2. While authenticated as Admin A, create one baseline system setting using POST
 *    /todoApp/adminUser/systemSettings.
 * 3. Register Admin B using POST /auth/adminUser/join and record Admin B's
 *    identity fields.
 * 4. Call GET /todoApp/adminUser/adminUsers/{adminUserId} with adminUserId being
 *    Admin B's id under the current authenticated admin context.
 * 5. Assert that the response is a valid ITodoAppAdminUser for Admin B and that
 *    exposed fields match Admin B's identity while remaining free of sensitive
 *    password materials (implicitly enforced by the DTO type).
 */
export async function test_api_admin_user_detail_view_by_creator_admin(
  connection: api.IConnection,
) {
  // 1. Register Admin A
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/register",
    referrer: "https://admin.todo-app.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAAuth: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuth);

  // 2. Create a baseline system setting as Admin A
  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(createdSetting);

  TestValidator.equals(
    "system setting key should match creation payload",
    createdSetting.key,
    systemSettingBody.key,
  );

  // 3. Register Admin B
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.local/register",
    referrer: "https://admin.todo-app.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminBAuth: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuth);

  // 4. Fetch Admin B's detailed profile
  const adminBDetail: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.at(connection, {
      adminUserId: adminBAuth.id,
    });
  typia.assert(adminBDetail);

  // 5. Validate that the detail response matches Admin B's identity and structure
  TestValidator.equals(
    "admin user detail id should match Admin B id",
    adminBDetail.id,
    adminBAuth.id,
  );
  TestValidator.equals(
    "admin user detail email should match Admin B email",
    adminBDetail.email,
    adminBAuth.email,
  );
  TestValidator.equals(
    "admin user detail status should match Admin B status",
    adminBDetail.status,
    adminBAuth.status,
  );

  if (
    adminBAuth.display_name !== null &&
    adminBAuth.display_name !== undefined
  ) {
    TestValidator.equals(
      "admin user detail display_name should match Admin B display_name when present",
      adminBDetail.display_name,
      adminBAuth.display_name,
    );
  }

  TestValidator.predicate(
    "admin user detail created_at should be a non-empty string",
    adminBDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "admin user detail updated_at should be a non-empty string",
    adminBDetail.updated_at.length > 0,
  );
}
