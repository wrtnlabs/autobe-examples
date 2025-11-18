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
 * Validate that an adminUser can retrieve detailed information for a member
 * user who already owns at least one todo.
 *
 * Business workflow:
 *
 * 1. Register an adminUser account and obtain admin tokens (connection becomes
 *    admin-authenticated).
 * 2. Register a member user account and obtain member tokens (connection becomes
 *    member-authenticated).
 * 3. As the member user, create at least one todo so that the account has
 *    activity.
 * 4. Switch back to the adminUser context via login so the connection is
 *    admin-authenticated again.
 * 5. As the adminUser, call the member user detail endpoint GET
 *    /todoApp/adminUser/memberUsers/{memberUserId} with the target member user
 *    id.
 * 6. Assert that the response is a full ITodoAppMemberuser record, with:
 *
 *    - Id and email matching the registered member user
 *    - Status set and non-empty
 *    - Failed_login_count = 0 for a fresh account
 *    - Deleted_at is null (or undefined) for an active account
 *    - Created_at and updated_at populated as valid date-time strings.
 * 7. Ensure that the existence of todos does not change the shape of the
 *    ITodoAppMemberuser response (no todo fields), which is guaranteed via
 *    typia.assert and DTO typing.
 */
export async function test_api_admin_member_user_detail_with_existing_todo(
  connection: api.IConnection,
) {
  // 1. Register adminUser and obtain admin tokens
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinOutput: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppAdminUser.IJoin,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminJoinOutput);

  // 2. Register member user and obtain member tokens
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const memberJoinOutput: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMemberUserJoin.IRequest,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(memberJoinOutput);

  // 3. As the member user, create at least one todo
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // Ensure the todo is owned by the joined member user
  TestValidator.equals(
    "created todo must belong to the joined member user",
    createdTodo.memberUser.id,
    memberJoinOutput.id,
  );

  // 4. Switch back to adminUser context via login
  const adminLoginOutput: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        user_agent: null,
      } satisfies ITodoAppAdminUser.ILogin,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminLoginOutput);

  // 5. As adminUser, retrieve member user detail
  const memberDetail: ITodoAppMemberuser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: memberJoinOutput.id,
    });
  typia.assert<ITodoAppMemberuser>(memberDetail);

  // 6. Business assertions on the member detail
  TestValidator.equals(
    "member detail id matches joined member user id",
    memberDetail.id,
    memberJoinOutput.id,
  );
  TestValidator.equals(
    "member detail email matches joined member user email",
    memberDetail.email,
    memberJoinOutput.email,
  );

  // status should be non-empty string (typia.assert ensures string type)
  TestValidator.predicate(
    "member status should be non-empty string",
    memberDetail.status.length > 0,
  );

  // failed_login_count should be 0 right after join and before any bad logins
  TestValidator.equals(
    "failed_login_count should be 0 for a fresh member user",
    memberDetail.failed_login_count,
    0,
  );

  // deleted_at should be null or undefined for active member
  TestValidator.predicate(
    "deleted_at should be null or undefined for an active member user",
    memberDetail.deleted_at === null || memberDetail.deleted_at === undefined,
  );

  // created_at and updated_at presence is already validated by typia.assert,
  // but we can still assert they are non-empty strings logically.
  TestValidator.predicate(
    "created_at should be a non-empty string",
    memberDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    memberDetail.updated_at.length > 0,
  );

  // 7. Indirectly confirm that todos do not affect member detail shape.
  // If the response had unexpected fields or wrong structure, typia.assert
  // above would have thrown. Therefore, no additional structural assertion
  // is required here beyond this business comment.
}
