import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that an authenticated admin user can update basic editable profile
 * and status fields of a member user account.
 *
 * Business goals:
 *
 * - Ensure that /todoApp/adminUser/memberUsers/{memberUserId} accepts a
 *   well-formed ITodoAppMemberuser.IUpdate payload when invoked by an
 *   authenticated adminUser.
 * - Confirm that mutable fields like display_name, status, and failed_login_count
 *   are updated while immutable identity fields (id, created_at) remain
 *   unchanged.
 * - Verify that updated_at is touched as part of the update operation.
 * - Exercise realistic preconditions: the member user exists, can log in, and
 *   owns at least one todo.
 */
export async function test_api_admin_member_user_update_basic_profile_fields(
  connection: api.IConnection,
) {
  // 1. Prepare an admin user (join implies authentication with token set).
  const adminJoinInput = typia.random<ITodoAppAdminUser.IJoin>();
  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Create a member user via join.
  const memberJoinRequest: ITodoAppMemberUserJoin.IRequest =
    typia.random<ITodoAppMemberUserJoin.IRequest>();
  const memberAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuth);

  const memberUserId = memberAuth.id;

  // Capture a pre-update snapshot-like view (using authorized payload fields).
  const beforeDisplayName = memberAuth.display_name ?? null;
  const beforeStatus = memberAuth.status;
  const beforeFailedLoginCount = memberAuth.failed_login_count;
  const beforeCreatedAt = memberAuth.created_at;
  const beforeUpdatedAt = memberAuth.updated_at;
  const beforeDeletedAt = memberAuth.deleted_at ?? null;

  // 3. Log in explicitly as the member user to simulate normal usage.
  const memberLoginRequest: ITodoAppMemberUserLogin.IRequest = {
    email: memberJoinRequest.email,
    password: memberJoinRequest.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const memberLoggedIn: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginRequest,
    });
  typia.assert(memberLoggedIn);

  TestValidator.equals(
    "member login should reference same user id as join",
    memberLoggedIn.id,
    memberUserId,
  );

  // 4. Create a todo as this member user to simulate real activity.
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "todo owner id should match member user id",
    createdTodo.memberUser.id,
    memberUserId,
  );

  // 5. Switch context back to the admin user.
  const adminLoginBody: ITodoAppAdminUser.ILogin = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: RandomGenerator.name(),
  };
  const adminLoggedIn: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  TestValidator.equals(
    "admin login id should match admin join id",
    adminLoggedIn.id,
    admin.id,
  );

  // 6. Build an update payload for the member user.
  const newDisplayName = RandomGenerator.name();
  const newStatus = "inactive";
  const newFailedLoginCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const updateBody = {
    display_name: newDisplayName,
    status: newStatus,
    failed_login_count: newFailedLoginCount,
  } satisfies ITodoAppMemberuser.IUpdate;

  const updatedMember: ITodoAppMemberuser =
    await api.functional.todoApp.adminUser.memberUsers.update(connection, {
      memberUserId,
      body: updateBody,
    });
  typia.assert(updatedMember);

  // 7. Validate response invariants and updates.
  TestValidator.equals(
    "member id should remain unchanged after update",
    updatedMember.id,
    memberUserId,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedMember.created_at,
    beforeCreatedAt,
  );

  TestValidator.equals(
    "display_name should be updated to the new value",
    updatedMember.display_name ?? null,
    newDisplayName,
  );

  TestValidator.equals(
    "status should be updated to the new value",
    updatedMember.status,
    newStatus,
  );

  TestValidator.equals(
    "failed_login_count should be updated to the new value",
    updatedMember.failed_login_count,
    newFailedLoginCount,
  );

  TestValidator.notEquals(
    "updated_at should differ from pre-update updated_at",
    updatedMember.updated_at,
    beforeUpdatedAt,
  );

  TestValidator.equals(
    "deleted_at should remain unchanged by profile update",
    updatedMember.deleted_at ?? null,
    beforeDeletedAt,
  );
}
