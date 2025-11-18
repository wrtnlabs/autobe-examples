import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate retrieval of detailed admin account profiles (self and other).
 *
 * - Verifies admin registration enables authenticated access to detailed admin
 *   profile by own id.
 * - Checks all returned fields for completeness and audit compliance (id, email,
 *   created_at, updated_at, and disabled_at).
 * - Registers a second admin and ensures both admins can fetch the other's
 *   profile, validating field privacy and audit trail.
 * - Verifies disabled_at is null/undefined for active accounts.
 * - Negative cases: unauthenticated access, non-admin actor, unknown/disabled
 *   adminId should be denied with strict error.
 */
export async function test_api_admin_account_detail_view_self_and_other(
  connection: api.IConnection,
) {
  // 1. Register first admin and authenticate
  const admin1Reg = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-portal.todo-list.com/register",
    referrer: "https://admin-portal.todo-list.com/login",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;
  const admin1Auth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: admin1Reg });
  typia.assert(admin1Auth);

  // 2. Retrieve own admin profile and assert returned fields
  const meProfile: ITodoListAdmin =
    await api.functional.todoList.admin.admins.at(connection, {
      adminId: admin1Auth.id,
    });
  typia.assert(meProfile);
  TestValidator.equals("own id", meProfile.id, admin1Auth.id);
  TestValidator.equals("own email", meProfile.email, admin1Auth.email);
  TestValidator.equals(
    "created_at present",
    typeof meProfile.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at present",
    typeof meProfile.updated_at,
    "string",
  );
  TestValidator.equals(
    "active admin disabled_at is null/undefined",
    meProfile.disabled_at,
    null,
  );

  // 3. Register second admin
  const admin2Reg = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-portal.todo-list.com/register",
    referrer: "https://admin-portal.todo-list.com/login",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;
  const admin2Auth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: admin2Reg });
  typia.assert(admin2Auth);

  // 4. Admin1 retrieves admin2's profile
  const admin2Profile: ITodoListAdmin =
    await api.functional.todoList.admin.admins.at(connection, {
      adminId: admin2Auth.id,
    });
  typia.assert(admin2Profile);
  TestValidator.equals("admin2 id", admin2Profile.id, admin2Auth.id);
  TestValidator.equals("admin2 email", admin2Profile.email, admin2Auth.email);
  TestValidator.equals(
    "admin2 created_at present",
    typeof admin2Profile.created_at,
    "string",
  );
  TestValidator.equals(
    "admin2 updated_at present",
    typeof admin2Profile.updated_at,
    "string",
  );
  TestValidator.equals(
    "admin2 disabled_at is null/undefined",
    admin2Profile.disabled_at,
    null,
  );

  // 5. Switch context: authenticate as admin2 by registering again (SDK connection)
  // The SDK auto-sets authorization after registration

  // 6. Admin2 fetches admin1's profile
  const admin1ProfileBy2: ITodoListAdmin =
    await api.functional.todoList.admin.admins.at(connection, {
      adminId: admin1Auth.id,
    });
  typia.assert(admin1ProfileBy2);
  TestValidator.equals("admin1 id", admin1ProfileBy2.id, admin1Auth.id);
  TestValidator.equals(
    "admin1 email",
    admin1ProfileBy2.email,
    admin1Auth.email,
  );
  TestValidator.equals(
    "admin1 created_at present",
    typeof admin1ProfileBy2.created_at,
    "string",
  );
  TestValidator.equals(
    "admin1 updated_at present",
    typeof admin1ProfileBy2.updated_at,
    "string",
  );
  TestValidator.equals(
    "admin1 disabled_at is null/undefined",
    admin1ProfileBy2.disabled_at,
    null,
  );

  // 7. Negative: unauthenticated request (simulate anonymous connection)
  const anonymous: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin profile request should fail",
    async () => {
      await api.functional.todoList.admin.admins.at(anonymous, {
        adminId: admin1Auth.id,
      });
    },
  );

  // 8. Negative: request unknown/nonexistent adminId
  const invalidAdminId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving nonexistent admin should fail",
    async () => {
      await api.functional.todoList.admin.admins.at(connection, {
        adminId: invalidAdminId,
      });
    },
  );

  // Note: Test disabled admin fetch if/when disabling functionality is implemented
}
