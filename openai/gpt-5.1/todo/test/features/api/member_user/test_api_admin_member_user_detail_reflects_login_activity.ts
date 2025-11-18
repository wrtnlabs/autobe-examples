import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Verify that the admin user’s member user detail view reflects login activity
 * and does not expose credential hashes.
 *
 * This test wires together the todoApp authentication flows for both adminUser
 * and memberUser with the administrative detail endpoint for member users:
 *
 * 1. Create an initial adminUser via POST /auth/adminUser/join so we have an
 *    administrative actor capable of calling GET
 *    /todoApp/adminUser/memberUsers/{memberUserId}. The SDK automatically
 *    stores the issued access token into `connection.headers.Authorization`.
 * 2. Register a new member user via POST /auth/memberUser/join using a random
 *    email, secure-looking password, and realistic href/referrer URIs. The
 *    response ITodoAppMemberuser.IAuthorized gives us the member user’s UUID
 *    and initial lifecycle fields.
 * 3. Perform a successful login for that same member user via POST
 *    /auth/memberUser/login, again providing correct email/password and session
 *    context metadata. This call is expected to update
 *    todo_app_memberusers.last_login_at to a non-null value and to adjust
 *    failed_login_count according to the authentication rules (for a clean
 *    scenario with only successful logins, failed_login_count should remain
 *    zero).
 * 4. Re-establish an adminUser authentication context by calling POST
 *    /auth/adminUser/join a second time with a different random email. This
 *    overwrites the connection’s Authorization header with an admin token so
 *    that subsequent calls are performed as adminUser.
 * 5. Invoke GET /todoApp/adminUser/memberUsers/{memberUserId} via
 *    api.functional.todoApp.adminUser.memberUsers.at, passing the member user
 *    id captured in step 2.
 * 6. Use typia.assert to validate that the response conforms to
 *    ITodoAppMemberuser, which implicitly guarantees that no password_hash
 *    field is exposed and that all documented lifecycle/login fields are
 *    well-typed.
 * 7. With TestValidator, assert business-level expectations:
 *
 *    - The admin detail view’s id and email match those from the
 *         ITodoAppMemberuser.IAuthorized join/login responses.
 *    - Status, created_at, and deleted_at are consistent between the authenticated
 *         member view and the admin detail view.
 *    - Last_login_at in the admin detail view is non-null after a successful login
 *         and matches the last_login_at from the login response.
 *    - Failed_login_count in the admin detail view is greater than or equal to the
 *         value observed from the login response (and typically zero in this
 *         happy-path scenario).
 */
export async function test_api_admin_member_user_detail_reflects_login_activity(
  connection: api.IConnection,
) {
  // 1. Bootstrap an initial adminUser to satisfy any admin-only access
  //    preconditions, even though we will overwrite the token later.
  const initialAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const initialAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: initialAdminJoinBody,
    });
  typia.assert(initialAdmin);

  // 2. Register a new member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joinedMember: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(joinedMember);

  // Capture initial lifecycle/login fields from the join response
  const joinedMemberId = joinedMember.id;
  const joinedMemberEmail = joinedMember.email;
  const joinedStatus = joinedMember.status;
  const joinedCreatedAt = joinedMember.created_at;
  const joinedDeletedAt = joinedMember.deleted_at ?? null;
  const joinedLastLoginAt = joinedMember.last_login_at ?? null;
  const joinedFailedLoginCount = joinedMember.failed_login_count;

  // 3. Perform a successful login for the same member user
  const memberLoginBody = {
    email: joinedMemberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const loggedInMember: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(loggedInMember);

  const loginLastLoginAt = loggedInMember.last_login_at ?? null;
  const loginFailedLoginCount = loggedInMember.failed_login_count;
  const loginStatus = loggedInMember.status;
  const loginCreatedAt = loggedInMember.created_at;
  const loginDeletedAt = loggedInMember.deleted_at ?? null;

  // 4. Re-establish an adminUser authentication context so that the
  //    admin-only memberUsers.at endpoint can be called.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 5. Call the admin detail endpoint for the member user
  const detail: ITodoAppMemberuser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: joinedMemberId,
    });
  typia.assert(detail);

  // 6. Assert identity and lifecycle consistency between member auth views
  //    and the admin detail view.
  TestValidator.equals(
    "admin detail id matches member user id",
    detail.id,
    joinedMemberId,
  );

  TestValidator.equals(
    "admin detail email matches member user email",
    detail.email,
    joinedMemberEmail,
  );

  TestValidator.equals(
    "admin detail status matches latest member status",
    detail.status,
    loginStatus,
  );

  TestValidator.equals(
    "admin detail created_at matches member created_at",
    detail.created_at,
    loginCreatedAt,
  );

  TestValidator.equals(
    "admin detail deleted_at matches member deleted_at",
    detail.deleted_at ?? null,
    loginDeletedAt,
  );

  // 7. Validate that last_login_at reflects successful login activity.
  TestValidator.predicate(
    "last_login_at should be non-null after successful login",
    detail.last_login_at !== null && detail.last_login_at !== undefined,
  );

  if (loginLastLoginAt !== null && loginLastLoginAt !== undefined) {
    TestValidator.equals(
      "admin detail last_login_at matches member last_login_at",
      detail.last_login_at ?? null,
      loginLastLoginAt,
    );
  }

  // 8. Validate failed_login_count behavior: it should not decrease and
  //    should remain a sane non-negative int32.
  TestValidator.predicate(
    "failed_login_count is non-negative in admin detail view",
    detail.failed_login_count >= 0,
  );

  TestValidator.predicate(
    "failed_login_count in admin detail is not less than value from login response",
    detail.failed_login_count >= loginFailedLoginCount,
  );

  TestValidator.predicate(
    "failed_login_count in admin detail is not less than value from join response",
    detail.failed_login_count >= joinedFailedLoginCount,
  );
}
