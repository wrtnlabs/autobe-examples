import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that the admin-only member user update endpoint enforces email
 * uniqueness and rejects attempts to assign an email already used by another
 * member account.
 *
 * Business context:
 *
 * - The todoApp enforces a unique index on member user emails in the
 *   `todo_app_memberusers` table.
 * - Admins can update member user profiles via PUT
 *   /todoApp/adminUser/memberUsers/{memberUserId}.
 * - A robustness requirement is that trying to change one member's email to
 *   another member's existing email must fail with a business error and must
 *   not corrupt stored data.
 *
 * This test focuses on the conflict behavior, not on success-path updates, and
 * uses only the APIs available in the SDK surface.
 *
 * High-level steps:
 *
 * 1. Register an admin user and authenticate as that admin.
 * 2. Under the admin context, create a system setting to simulate global
 *    configuration activation (even though uniqueness is ultimately enforced at
 *    the DB level).
 * 3. Register memberUserA with a unique email.
 * 4. While authenticated as memberUserA (join auto-logs in), create at least one
 *    todo to ensure the user has activity.
 * 5. Switch back to the admin account via admin login.
 * 6. Register memberUserB with a different, unique email.
 * 7. While authenticated as memberUserB, create at least one todo.
 * 8. Switch again to the admin account via admin login so that admin-only
 *    endpoints are callable.
 * 9. Attempt to update memberUserA's email to memberUserB's email using the admin
 *    update endpoint. Wrap this call with TestValidator.error to assert that
 *    some error is thrown (the exact HTTP status or error body is not asserted,
 *    per constraints).
 *
 * Limitations and scenario adaptation:
 *
 * - The given SDK list does not include a GET endpoint for
 *   /todoApp/adminUser/memberUsers/{memberUserId}, so we cannot re-fetch
 *   memberUserA and memberUserB after the failed update to confirm that their
 *   emails remain unchanged. According to the "rewrite impossible scenarios"
 *   rule, this post-condition check is omitted.
 * - In simulation mode (connection.simulate === true), the update simulator
 *   always returns a random ITodoAppMemberUser and never throws, so the
 *   uniqueness violation cannot be observed there. This E2E test therefore
 *   validates the conflict behavior only when executed against a real backend.
 */
export async function test_api_admin_member_user_update_email_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Register admin user (join) and become authenticated as admin.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPw123!" as const;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedOnJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  // 2. Create a system setting as admin to simulate configuration enablement.
  const systemSettingBody = {
    key: "email_unique_required",
    value: "true",
    type: "boolean",
    description:
      "Require unique email addresses for todo_app_memberusers records.",
    group: "memberUser",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 3. Register memberUserA with a unique email.
  const memberUserAEmail = typia.random<string & tags.Format<"email">>();
  const memberUserAPassword = "MemberA123!" as const;

  const memberUserAJoinBody = {
    email: memberUserAEmail,
    password: memberUserAPassword,
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://todoapp.local/signup",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberUserAAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserAJoinBody,
    });
  typia.assert(memberUserAAuthorized);

  const memberUserAId = memberUserAAuthorized.id;

  // 4. As memberUserA (current auth), create at least one todo.
  const todoABody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoABody,
    });
  typia.assert(todoA);

  // 5. Switch back to the admin account via login.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/login",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedOnLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 6. Register memberUserB with a different unique email.
  const memberUserBEmail = typia.random<string & tags.Format<"email">>();
  const memberUserBPassword = "MemberB123!" as const;

  const memberUserBJoinBody = {
    email: memberUserBEmail,
    password: memberUserBPassword,
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://todoapp.local/signup",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberUserBAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserBJoinBody,
    });
  typia.assert(memberUserBAuthorized);

  // 7. As memberUserB (current auth), create at least one todo.
  const todoBBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoB: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoBBody,
    });
  typia.assert(todoB);

  // 8. Switch again to admin context via login before performing the update.
  const adminAuthorizedBeforeUpdate: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedBeforeUpdate);

  // 9. Attempt to update memberUserA's email to memberUserB's email.
  //    This should violate the unique index on email and trigger an error
  //    in a real backend. We assert only that some error occurs.
  await TestValidator.error(
    "admin update should fail when changing memberUserA email to memberUserB's existing email",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.update(connection, {
        memberUserId: memberUserAId,
        body: {
          email: memberUserBAuthorized.email,
        } satisfies ITodoAppMemberUser.IUpdate,
      });
    },
  );
}
