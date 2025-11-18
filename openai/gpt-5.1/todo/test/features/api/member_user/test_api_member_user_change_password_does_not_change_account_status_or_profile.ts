import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberuser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserChangePassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserChangePassword";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Verify that changing a member user's password does not modify account status
 * or profile fields.
 *
 * Business goal:
 *
 * - Password change is a security-only operation. It must not alter lifecycle
 *   fields such as `status` or `deleted_at`, nor profile fields like
 *   `display_name`, when observed from the admin memberUsers listing endpoint.
 *
 * Flow:
 *
 * 1. Create an admin user (POST /auth/adminUser/join) and rely on automatic login.
 * 2. Create a member user (POST /auth/memberUser/join) with a known
 *    `display_name`.
 * 3. As admin, query member users (PATCH /todoApp/adminUser/memberUsers) filtered
 *    by email, capture the summary for the created member (id, email, status,
 *    display_name, last_login_at).
 * 4. Switch to the member user (POST /auth/memberUser/login) using their
 *    email/password.
 * 5. Change password (PUT /auth/memberUser/password) with correct currentPassword
 *    and a newPassword; assert success in the response.
 * 6. Optionally, login again with the new password to prove it works (not strictly
 *    required for the invariants but gives additional confidence that the
 *    change took effect).
 * 7. Switch back to admin (POST /auth/adminUser/login).
 * 8. Query member users again with the same filter.
 * 9. Assert that the member is still present and that `status` and `display_name`
 *    are unchanged compared to before the password change. Do not assert on
 *    last_login_at because it may change as part of login flows.
 */
export async function test_api_member_user_change_password_does_not_change_account_status_or_profile(
  connection: api.IConnection,
) {
  // 1. Register an admin user and rely on automatic login via token header.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminDisplayName: string = RandomGenerator.name();

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
      } satisfies ITodoAppAdminUser.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. Register a member user; join also authenticates that member user, but we only
  //    need the identity and email/password for later.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const memberDisplayName: string = RandomGenerator.name();

  const memberAuthorizedOnJoin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: memberDisplayName,
        href: "https://example.com/join",
        referrer: "https://example.com/landing",
        ip: null,
      } satisfies ITodoAppMemberUserJoin.IRequest,
    });
  typia.assert(memberAuthorizedOnJoin);

  // 3. Switch back to admin explicitly to ensure admin context for listing.
  const adminAfterJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://example.com/admin/login",
        referrer: "https://example.com/admin",
        ip: null,
        user_agent: null,
      } satisfies ITodoAppAdminUser.ILogin,
    });
  typia.assert(adminAfterJoin);

  // 4. Admin queries member users list filtered by email to capture baseline summary.
  const firstPage: IPageITodoAppMemberuser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: {
        page: 1,
        limit: 10,
        email: memberEmail,
        status: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        deleted: undefined,
        orderBy: undefined,
        orderDirection: undefined,
      } satisfies ITodoAppMemberuser.IRequest,
    });
  typia.assert(firstPage);

  TestValidator.predicate(
    "admin listing should return at least one member for the given email",
    firstPage.data.length > 0,
  );

  const baseline = firstPage.data.find((u) => u.email === memberEmail);
  TestValidator.predicate(
    "baseline member summary for email must be found",
    !!baseline,
  );

  if (!baseline) return; // Safeguard for TypeScript; logically unreachable after predicate.

  const baselineId = baseline.id;
  const baselineStatus = baseline.status;
  const baselineDisplayName = baseline.display_name;

  // 5. Switch to the member user by logging in with their original password.
  const memberAuthorizedOnLogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: "https://example.com/member/login",
        referrer: "https://example.com",
        ip: null,
      } satisfies ITodoAppMemberUserLogin.IRequest,
    });
  typia.assert(memberAuthorizedOnLogin);

  // 6. Change the password for the authenticated member user.
  const newPassword: string = RandomGenerator.alphaNumeric(16);

  const changeResult: ITodoAppMemberUserChangePassword.IResponse =
    await api.functional.auth.memberUser.password.changePassword(connection, {
      body: {
        currentPassword: memberPassword,
        newPassword,
      } satisfies ITodoAppMemberUserChangePassword.IRequest,
    });
  typia.assert(changeResult);

  TestValidator.predicate(
    "password change operation should report success",
    changeResult.success === true,
  );

  // 7. Optionally, verify new password works by logging in again.
  const memberAuthorizedWithNewPassword: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        email: memberEmail,
        password: newPassword,
        href: "https://example.com/member/login",
        referrer: "https://example.com/after-change",
        ip: null,
      } satisfies ITodoAppMemberUserLogin.IRequest,
    });
  typia.assert(memberAuthorizedWithNewPassword);

  TestValidator.equals(
    "member id should remain the same after password change and re-login",
    memberAuthorizedWithNewPassword.id,
    baselineId,
  );

  // 8. Switch back to admin context.
  const adminAfterPasswordChange: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://example.com/admin/login",
        referrer: "https://example.com/admin/after-change",
        ip: null,
        user_agent: null,
      } satisfies ITodoAppAdminUser.ILogin,
    });
  typia.assert(adminAfterPasswordChange);

  // 9. Admin lists member users again to check that lifecycle/profile fields are unchanged.
  const secondPage: IPageITodoAppMemberuser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: {
        page: 1,
        limit: 10,
        email: memberEmail,
        status: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        deleted: undefined,
        orderBy: undefined,
        orderDirection: undefined,
      } satisfies ITodoAppMemberuser.IRequest,
    });
  typia.assert(secondPage);

  const afterChange = secondPage.data.find((u) => u.id === baselineId);
  TestValidator.predicate(
    "member summary with matching id should still be present after password change",
    !!afterChange,
  );

  if (!afterChange) return;

  // Assert that email and id remain identical.
  TestValidator.equals(
    "member id should be unchanged after password change",
    afterChange.id,
    baselineId,
  );
  TestValidator.equals(
    "member email should be unchanged after password change",
    afterChange.email,
    memberEmail,
  );

  // Assert that lifecycle/profile fields visible to admin are unchanged.
  TestValidator.equals(
    "member status should remain unchanged after password change",
    afterChange.status,
    baselineStatus,
  );

  // Handle nullable/optional display_name correctly: normalize to null when absent.
  TestValidator.equals(
    "member display_name should remain unchanged after password change",
    afterChange.display_name ?? null,
    baselineDisplayName ?? null,
  );
}
