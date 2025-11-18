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

export async function test_api_admin_member_user_detail_view_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: create and authenticate admin via join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> =
    "Adm1n!Passw0rd" as string & tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const joinedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  // 2. System settings setup by admin
  const systemSettingBody = {
    key: `member_user_profile_enabled_${RandomGenerator.alphaNumeric(8)}`,
    value: "true",
    type: "boolean",
    description: "Enable member user profile management in admin UI",
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 3. Member user bootstrap: create member via join on a fresh connection clone
  const memberConnection: api.IConnection = { ...connection };
  // Clear auth headers by using a new headers object, without touching original headers further
  memberConnection.headers = {};

  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> =
    "M3mb3r!Pass" as string & tags.Format<"password">;

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const joinedMember: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(memberConnection, {
      body: memberJoinBody,
    });
  typia.assert(joinedMember);

  // 3.3. Create at least one todo for this member user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(memberConnection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo belongs to the joined member user",
    createdTodo.memberUser.id,
    joinedMember.id,
  );

  // 4. Admin reads member user details before update
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.ILogin;

  const loggedInAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  const beforeState: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: joinedMember.id,
    });
  typia.assert(beforeState);

  TestValidator.equals(
    "beforeState.id matches joined member id",
    beforeState.id,
    joinedMember.id,
  );
  TestValidator.equals(
    "beforeState.email matches joined member email",
    beforeState.email,
    joinedMember.email,
  );
  TestValidator.equals(
    "beforeState.display_name matches joined member display_name",
    beforeState.display_name ?? null,
    joinedMember.display_name ?? null,
  );

  // 5. Admin updates member user profile (email + display_name only)
  const newMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const newDisplayName: string = RandomGenerator.name();

  const updateBody = {
    email: newMemberEmail,
    display_name: newDisplayName,
    // status intentionally omitted so it should remain unchanged
  } satisfies ITodoAppMemberUser.IUpdate;

  const updated: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.update(connection, {
      memberUserId: joinedMember.id,
      body: updateBody,
    });
  typia.assert(updated);

  TestValidator.equals("updated.id is unchanged", updated.id, beforeState.id);
  TestValidator.equals(
    "updated.created_at is unchanged",
    updated.created_at,
    beforeState.created_at,
  );
  TestValidator.equals(
    "updated.status remains unchanged when not provided in IUpdate",
    updated.status,
    beforeState.status,
  );
  TestValidator.equals(
    "updated.email matches the new email from update payload",
    updated.email,
    newMemberEmail,
  );
  TestValidator.equals(
    "updated.display_name matches the new display name",
    updated.display_name ?? null,
    newDisplayName,
  );

  // Compare updated_at lexicographically (ISO 8601 string) to ensure it is not earlier
  TestValidator.predicate(
    "updated.updated_at is later than or equal to beforeState.updated_at",
    updated.updated_at >= beforeState.updated_at,
  );

  // 6. Admin re-reads member user details after update
  const afterState: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: joinedMember.id,
    });
  typia.assert(afterState);

  TestValidator.equals(
    "afterState.id remains identical to beforeState.id",
    afterState.id,
    beforeState.id,
  );
  TestValidator.equals(
    "afterState.created_at remains identical to beforeState.created_at",
    afterState.created_at,
    beforeState.created_at,
  );
  TestValidator.equals(
    "afterState.status remains unchanged across update cycle",
    afterState.status,
    beforeState.status,
  );
  TestValidator.equals(
    "afterState.email reflects the updated email",
    afterState.email,
    newMemberEmail,
  );
  TestValidator.equals(
    "afterState.display_name reflects the updated display name",
    afterState.display_name ?? null,
    newDisplayName,
  );
  TestValidator.equals(
    "afterState.updated_at equals the updated.updated_at value",
    afterState.updated_at,
    updated.updated_at,
  );
  TestValidator.predicate(
    "afterState.updated_at is later than or equal to beforeState.updated_at",
    afterState.updated_at >= beforeState.updated_at,
  );
}
