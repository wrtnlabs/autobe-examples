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

export async function test_api_admin_member_user_profile_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user via /auth/adminUser/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
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

  // 2. As admin, create a relevant system setting that could affect member updates
  const systemSettingBody = {
    key: "feature.member_profile_editing.enabled",
    value: "true",
    type: "boolean",
    description:
      "Toggle to enable member profile editing by admin users in tests.",
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);
  TestValidator.equals(
    "system setting key should match request",
    systemSetting.key,
    systemSettingBody.key,
  );

  // 3. Register a member user via /auth/memberUser/join
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    href: "https://todoapp.test/member/join" as string & tags.Format<"uri">,
    referrer: "https://todoapp.test/landing" as string & tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorized);

  // 3-1. Capture baseline timestamps for comparison after update
  const originalMemberId = memberAuthorized.id;
  const originalCreatedAt = memberAuthorized.created_at;
  const originalUpdatedAt = memberAuthorized.updated_at;

  // 3-2. As the member user, create at least one todo to mark the account as active
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(todo);
  TestValidator.equals(
    "todo owner id should equal member user id",
    todo.memberUser.id,
    originalMemberId,
  );

  // 4. Switch back to adminUser context by logging in as admin
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/login",
    referrer: "https://admin.todoapp.test/dashboard",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoginAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminLoginAuthorized);

  // 5. Prepare an update payload to change email, display_name and status
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedDisplayName = RandomGenerator.name();
  const updatedStatus = "active";

  const memberUpdateBody = {
    email: updatedEmail,
    display_name: updatedDisplayName,
    status: updatedStatus,
  } satisfies ITodoAppMemberUser.IUpdate;

  // 6. Call PUT /todoApp/adminUser/memberUsers/{memberUserId}
  const updatedMember: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.update(connection, {
      memberUserId: originalMemberId,
      body: memberUpdateBody,
    });
  typia.assert<ITodoAppMemberUser>(updatedMember);

  // 7. Validate core invariants and updated fields
  TestValidator.equals(
    "updated member id should equal original member id",
    updatedMember.id,
    originalMemberId,
  );
  TestValidator.equals(
    "updated email should match request payload",
    updatedMember.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated display_name should match request payload",
    updatedMember.display_name ?? null,
    updatedDisplayName,
  );
  TestValidator.equals(
    "updated status should match request payload",
    updatedMember.status,
    updatedStatus,
  );

  // created_at must remain unchanged
  TestValidator.equals(
    "created_at should remain unchanged after profile update",
    updatedMember.created_at,
    originalCreatedAt,
  );

  // updated_at should be later than or equal to previous updated_at, and later than created_at
  TestValidator.predicate(
    "updated_at should be later than or equal to previous updated_at",
    new Date(updatedMember.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  TestValidator.predicate(
    "updated_at should be later than or equal to created_at",
    new Date(updatedMember.updated_at).getTime() >=
      new Date(updatedMember.created_at).getTime(),
  );
}
