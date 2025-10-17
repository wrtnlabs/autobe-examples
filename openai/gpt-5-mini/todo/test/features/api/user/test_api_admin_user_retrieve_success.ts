import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate that an administrator can retrieve a user's public profile via
 * admin-scoped endpoint and that sensitive fields are not exposed.
 *
 * Steps:
 *
 * 1. Create a new admin account via POST /auth/admin/join (adminConn).
 * 2. Create a new regular user via POST /auth/user/join (userConn).
 * 3. Using adminConn (which contains admin's token), call GET
 *    /todoApp/admin/users/:userId to retrieve the created user's profile.
 *
 * Assertions:
 *
 * - Response is a valid ITodoAppUser (typia.assert)
 * - Returned id equals the created user's id
 * - Returned email equals the created user's email
 * - Response MUST NOT include any sensitive secret such as `password_hash`
 * - Updated_at is greater than or equal to created_at
 *
 * Note: Audit-record verification is expected by the service but no audit
 * retrieval API is available in the provided SDK. If an audit endpoint exists
 * in the environment, a separate assertion should validate an audit record for
 * this admin access.
 */
export async function test_api_admin_user_retrieve_success(
  connection: api.IConnection,
) {
  // 1) Prepare a separate connection for admin to avoid overwriting the main connection headers
  const adminConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create admin account
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    is_super: true,
  } satisfies ITodoAppAdmin.ICreate;

  const adminAuthorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminConn, { body: adminBody });
  typia.assert(adminAuthorized);

  // 3) Prepare a separate connection for the normal user
  const userConn: api.IConnection = { ...connection, headers: {} };

  // 4) Create the target user that admin will retrieve
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPass123!",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const userAuthorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(userConn, { body: userBody });
  typia.assert(userAuthorized);

  // 5) Using adminConn (admin token was set on adminConn by the SDK join call), retrieve the user
  const retrieved: ITodoAppUser = await api.functional.todoApp.admin.users.at(
    adminConn,
    {
      userId: userAuthorized.id,
    },
  );
  typia.assert(retrieved);

  // 6) Business assertions
  TestValidator.equals(
    "user id matches created user id",
    retrieved.id,
    userAuthorized.id,
  );
  TestValidator.equals(
    "user email matches created email",
    retrieved.email,
    userAuthorized.email,
  );
  TestValidator.predicate(
    "password_hash not exposed in response",
    !("password_hash" in retrieved),
  );

  // 7) Timestamps: ensure updated_at is >= created_at
  const createdAt = Date.parse(retrieved.created_at);
  const updatedAt = Date.parse(retrieved.updated_at);
  TestValidator.predicate(
    "updated_at should be >= created_at",
    updatedAt >= createdAt,
  );

  // 8) Display name equality (may be null depending on server policy). If server returns null,
  //    the check below still validates that the returned value equals the created display_name.
  TestValidator.equals(
    "display_name matches",
    retrieved.display_name ?? null,
    userBody.display_name ?? null,
  );

  // 9) Audit record expectation:
  // NOTE: The service should record an audit entry for admin reads (actor_role='admin', action_type='read_user').
  // Since no audit retrieval SDK function is provided, we only document the expectation here. If an audit
  // retrieval endpoint is available in the environment, a follow-up call should assert existence of the
  // corresponding audit record referencing adminAuthorized.id and userAuthorized.id.
}
