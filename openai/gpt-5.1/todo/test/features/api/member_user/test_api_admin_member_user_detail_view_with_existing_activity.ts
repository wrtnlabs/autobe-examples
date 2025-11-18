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
 * Validate that an authenticated admin user can retrieve the detailed profile
 * of a member user who already has todo activity.
 *
 * Business workflow validated:
 *
 * 1. Admin self-registers (join) and becomes authenticated.
 * 2. Admin creates a baseline system setting to simulate typical configured admin
 *    environment.
 * 3. A member user self-registers (join) and becomes authenticated.
 * 4. That member user creates a todo, ensuring the account has domain activity.
 * 5. Admin logs in again to restore admin Authorization context.
 * 6. Admin fetches the member user's details by ID using the
 *    /todoApp/adminUser/memberUsers/{memberUserId} endpoint.
 * 7. The response is asserted to match ITodoAppMemberUser and to have consistent
 *    identity and lifecycle fields.
 */
export async function test_api_admin_member_user_detail_view_with_existing_activity(
  connection: api.IConnection,
) {
  // 1. Admin joins (self-registration) and becomes authenticated.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/join",
    referrer: "https://admin.todoapp.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  // 2. Admin creates a baseline system setting.
  const systemSettingBody = {
    key: `feature_flag_${RandomGenerator.alphabets(8)}`,
    value: "true",
    type: "boolean",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);

  // 3. Member user joins and becomes authenticated.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinBody = {
    email: memberEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.test/join",
    referrer: "https://todoapp.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorized);

  // 4. Member creates at least one todo.
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // Sanity check: the todo's memberUser should match the authorized member.
  TestValidator.equals(
    "todo owner id should match member user id",
    createdTodo.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "todo owner email should match member user email",
    createdTodo.memberUser.email,
    memberAuthorized.email,
  );

  // 5. Switch back to admin by logging in with the same admin credentials.
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.todoapp.test/login",
    referrer: "https://admin.todoapp.test/join",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminReAuth: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminReAuth);

  // 6. Admin fetches the member user details by ID.
  const memberDetail: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: memberAuthorized.id,
    });
  typia.assert<ITodoAppMemberUser>(memberDetail);

  // 7. Validate core identity and lifecycle fields.
  TestValidator.equals(
    "member detail id matches authorized member id",
    memberDetail.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "member detail email matches authorized member email",
    memberDetail.email,
    memberAuthorized.email,
  );

  // status should be a non-empty string.
  TestValidator.predicate(
    "member status is non-empty string",
    typeof memberDetail.status === "string" && memberDetail.status.length > 0,
  );

  // created_at <= updated_at (lexicographical compare is valid for ISO strings).
  TestValidator.predicate(
    "member created_at is not after updated_at",
    memberDetail.created_at <= memberDetail.updated_at,
  );
}
