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
 * Validate that disabling a member user via admin update blocks future logins.
 *
 * Business goal:
 *
 * - Ensure that when an admin changes a member user's status to a disabled-like
 *   state using the admin-only update endpoint, the authentication flow
 *   respects this status and rejects subsequent login attempts for that
 *   account.
 *
 * High-level steps:
 *
 * 1. Create an adminUser using POST /auth/adminUser/join, which also seeds the
 *    Authorization header for admin-only operations.
 * 2. Register a member user with POST /auth/memberUser/join, capturing their id,
 *    email, and password.
 * 3. As the member user, perform a successful login via POST
 *    /auth/memberUser/login to establish the baseline that the account can
 *    currently authenticate.
 * 4. Switch the connection context back to an adminUser by calling
 *    /auth/adminUser/join again with a distinct admin email so that the
 *    Authorization header carries admin credentials.
 * 5. Call PUT /todoApp/adminUser/memberUsers/{memberUserId} with an
 *    ITodoAppMemberuser.IUpdate payload that sets status to a disabled-like
 *    string value (for example, "disabled"). Validate that the response is a
 *    full ITodoAppMemberuser object whose id matches the target member user and
 *    whose status property equals the disabled value.
 * 6. Optionally call GET /todoApp/adminUser/memberUsers/{memberUserId} to re-read
 *    the member user and confirm that the persisted status remains disabled.
 * 7. Attempt to log in again as the member user using the same email/password
 *    combination via POST /auth/memberUser/login. This time the login must fail
 *    because the account has been disabled. Wrap this call in
 *    TestValidator.error to ensure an error is thrown, but do not assert on
 *    specific HTTP status codes or error payloads.
 *
 * Assertions:
 *
 * - All created and fetched DTOs pass typia.assert for structural and type
 *   validation.
 * - The member user can log in successfully before the status change.
 * - After the admin updates the member user's status to disabled, the
 *   ITodoAppMemberuser (and optional GET re-read) shows the disabled status.
 * - A subsequent login attempt for the disabled member user fails and is captured
 *   by TestValidator.error with a descriptive title.
 */
export async function test_api_admin_member_user_update_disable_account_blocks_future_login(
  connection: api.IConnection,
) {
  // 1. Create an admin user who can manage member users
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;
  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a new member user whose account will later be disabled
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

  const memberAuthorizedOnJoin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedOnJoin);

  const memberUserId: string & tags.Format<"uuid"> = memberAuthorizedOnJoin.id;

  // 3. Verify that the member user can log in successfully before disabling
  const preDisableLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberAuthorizedOnLogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: preDisableLoginBody,
    });
  typia.assert(memberAuthorizedOnLogin);

  TestValidator.equals(
    "member login succeeds before disabling",
    memberAuthorizedOnLogin.id,
    memberUserId,
  );

  // 4. Switch back to an admin context by joining another admin user
  const secondAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;
  const secondAdminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: secondAdminJoinBody,
    });
  typia.assert(secondAdminAuthorized);

  // 5. Admin updates the member user's status to a disabled-like value
  const disabledStatus = "disabled";
  const updateBody = {
    status: disabledStatus,
  } satisfies ITodoAppMemberuser.IUpdate;

  const updatedMember: ITodoAppMemberuser =
    await api.functional.todoApp.adminUser.memberUsers.update(connection, {
      memberUserId,
      body: updateBody,
    });
  typia.assert(updatedMember);

  TestValidator.equals(
    "updated member id remains unchanged",
    updatedMember.id,
    memberUserId,
  );
  TestValidator.equals(
    "member status updated to disabled",
    updatedMember.status,
    disabledStatus,
  );

  // 6. Re-read the member user via admin detail endpoint to confirm status
  const reloadedMember: ITodoAppMemberuser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId,
    });
  typia.assert(reloadedMember);

  TestValidator.equals(
    "reloaded member reflects disabled status",
    reloadedMember.status,
    disabledStatus,
  );

  // 7. Attempt to log in again as the now-disabled member user; this must fail
  const postDisableLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  await TestValidator.error("disabled member cannot log in", async () => {
    await api.functional.auth.memberUser.login(connection, {
      body: postDisableLoginBody,
    });
  });
}
