import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberuser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberUserLogoutAll } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogoutAll";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate that global member user logout does not delete or mutate the
 * underlying todo_app_memberusers account record.
 *
 * Business purpose:
 *
 * - LogoutAll is a session-management operation that should operate only on
 *   todo_app_memberuser_sessions and token revocation, not on the
 *   todo_app_memberusers row itself.
 * - Member users must remain able to log in after a global logout, and admins
 *   must still see the account unchanged via admin search.
 *
 * Scenario steps:
 *
 * 1. Create an admin user so we can later inspect member accounts through the
 *    admin memberUsers index endpoint.
 * 2. Register a new member user via /auth/memberUser/join and capture the returned
 *    ITodoAppMemberuser.IAuthorized as the initial account snapshot.
 * 3. Log in as the same member user via /auth/memberUser/login at least once to
 *    exercise the normal login flow and capture a second snapshot.
 * 4. While authenticated as that member user, call /auth/memberUser/logoutAll and
 *    assert that the response indicates success and provides a non-negative
 *    affectedSessionCount.
 * 5. Log in again as the same member user to prove the account is still active and
 *    obtain a third ITodoAppMemberuser.IAuthorized snapshot.
 * 6. Switch to the admin user context and call PATCH
 *    /todoApp/adminUser/memberUsers with a filter by the member email,
 *    retrieving an IPageITodoAppMemberuser.ISummary page. Locate the member's
 *    summary record by id.
 * 7. Cross-check invariants across all snapshots and the admin summary:
 *
 *    - Id must be identical everywhere.
 *    - Email must be identical everywhere.
 *    - Display_name (if set) must be stable between join snapshot and admin summary;
 *         nullable semantics are respected.
 *    - Status must match between snapshots and summary and must not indicate
 *         deletion or other lifecycle change caused by logoutAll.
 *    - Deleted_at must remain the same across member snapshots (typically null),
 *         proving logoutAll did not soft-delete the account.
 *    - Created_at must be identical across all member snapshots, confirming that the
 *         same DB row is reused, not recreated.
 *    - Updated_at and last_login_at may advance forward with each successful login
 *         but must never regress or reset unexpectedly.
 *    - The account must still appear in the admin search results filtered by email.
 */
export async function test_api_member_user_logout_all_does_not_delete_account(
  connection: api.IConnection,
) {
  // 1. Admin user setup: join as an admin to get tokens for later admin calls.
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12) + "!A";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminJoin);

  // 2. Member user setup: join as a new member user and capture initial snapshot.
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12) + "!a";
  const href: string = "https://todo-app.example.com/join";
  const referrer: string = "https://landing.example.com";

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberJoinAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(memberJoinAuth);

  // Snapshot 1: initial account state right after join.
  const initialSnapshot: ITodoAppMemberuser.IAuthorized = memberJoinAuth;

  // 3. First login as the member user and capture snapshot 2.
  const loginHref: string = "https://todo-app.example.com/login";
  const loginReferrer: string = "https://todo-app.example.com";

  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const firstLoginAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(firstLoginAuth);

  const postLoginSnapshot: ITodoAppMemberuser.IAuthorized = firstLoginAuth;

  // Ensure basic invariants between join and first login.
  TestValidator.equals(
    "member id remains the same between join and first login",
    postLoginSnapshot.id,
    initialSnapshot.id,
  );
  TestValidator.equals(
    "member email remains the same between join and first login",
    postLoginSnapshot.email,
    initialSnapshot.email,
  );

  // 4. While authenticated as member, perform global logout.
  const logoutAllResult: ITodoAppMemberUserLogoutAll.IResponse =
    await api.functional.auth.memberUser.logoutAll(connection);
  typia.assert<ITodoAppMemberUserLogoutAll.IResponse>(logoutAllResult);

  TestValidator.predicate(
    "logoutAll result reports success",
    logoutAllResult.success === true,
  );
  TestValidator.predicate(
    "logoutAll affectedSessionCount is non-negative",
    logoutAllResult.affectedSessionCount >= 0,
  );

  // 5. Log in again as the same member user after global logout.
  const secondLoginAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(secondLoginAuth);

  const postLogoutAllSnapshot: ITodoAppMemberuser.IAuthorized = secondLoginAuth;

  // Core identity invariants across all three member snapshots.
  TestValidator.equals(
    "member id remains stable across join, first login, and post-logoutAll login",
    postLogoutAllSnapshot.id,
    initialSnapshot.id,
  );
  TestValidator.equals(
    "member email remains stable across all member snapshots",
    postLogoutAllSnapshot.email,
    initialSnapshot.email,
  );

  // Display name invariants (respect nullable semantics).
  TestValidator.equals(
    "display_name is consistent between join and post-logoutAll login",
    postLogoutAllSnapshot.display_name ?? null,
    initialSnapshot.display_name ?? null,
  );

  // Status must remain the same logical account status across snapshots.
  TestValidator.equals(
    "status remains the same across join and post-logoutAll login",
    postLogoutAllSnapshot.status,
    initialSnapshot.status,
  );

  // deleted_at must not change due to logoutAll.
  TestValidator.equals(
    "deleted_at is unchanged by logoutAll",
    postLogoutAllSnapshot.deleted_at ?? null,
    postLoginSnapshot.deleted_at ?? null,
  );

  // created_at must remain constant (same DB row).
  TestValidator.equals(
    "created_at is identical across all member snapshots",
    postLogoutAllSnapshot.created_at,
    initialSnapshot.created_at,
  );

  // updated_at and last_login_at should only move forward (or stay equal), never backwards.
  TestValidator.predicate(
    "updated_at after logoutAll login is not earlier than initial created_at",
    postLogoutAllSnapshot.updated_at >= initialSnapshot.created_at,
  );
  if (
    postLoginSnapshot.last_login_at !== undefined &&
    postLoginSnapshot.last_login_at !== null &&
    postLogoutAllSnapshot.last_login_at !== undefined &&
    postLogoutAllSnapshot.last_login_at !== null
  ) {
    TestValidator.predicate(
      "last_login_at after logoutAll login is not earlier than first login last_login_at",
      postLogoutAllSnapshot.last_login_at >= postLoginSnapshot.last_login_at,
    );
  }

  // 6. Switch to admin user context by logging in as the admin again
  //    (SDK will update connection headers with admin token).
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://todo-app.example.com/admin/login",
    referrer: "https://todo-app.example.com/admin",
    user_agent: "e2e-test-suite",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminLogin);

  // 7. As admin, search for the member user in memberUsers.index.
  const memberSearchBody = {
    page: 1,
    limit: 10,
    email: memberEmail,
    status: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    deleted: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies ITodoAppMemberuser.IRequest;

  const searchResult: IPageITodoAppMemberuser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: memberSearchBody,
    });
  typia.assert<IPageITodoAppMemberuser.ISummary>(searchResult);

  TestValidator.predicate(
    "admin search returns at least one member user for the email",
    searchResult.pagination.records >= 1 && searchResult.data.length >= 1,
  );

  const foundMemberSummary = searchResult.data.find(
    (summary) => summary.id === postLogoutAllSnapshot.id,
  );

  TestValidator.predicate(
    "member appears in admin memberUsers search results",
    !!foundMemberSummary,
  );

  if (foundMemberSummary) {
    // Identity and profile consistency between admin summary and member snapshot.
    TestValidator.equals(
      "admin summary id matches member snapshot id",
      foundMemberSummary.id,
      postLogoutAllSnapshot.id,
    );
    TestValidator.equals(
      "admin summary email matches member snapshot email",
      foundMemberSummary.email,
      postLogoutAllSnapshot.email,
    );
    TestValidator.equals(
      "admin summary display_name matches member snapshot display_name",
      foundMemberSummary.display_name ?? null,
      postLogoutAllSnapshot.display_name ?? null,
    );
    TestValidator.equals(
      "admin summary status matches member snapshot status",
      foundMemberSummary.status,
      postLogoutAllSnapshot.status,
    );
  }
}
