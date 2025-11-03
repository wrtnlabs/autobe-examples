import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminAction";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminAction";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_admin_admin_actions_index_listing(
  connection: api.IConnection,
) {
  // 1. Create a todoUser (will set connection.headers to the todoUser token)
  const todoUserEmail = typia.random<string & tags.Format<"email">>();
  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: todoUserEmail,
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(),
        href: "http://example.com/signup",
        referrer: "http://referrer.example.com",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(todoUser);

  // 2. As todoUser, create a todo list that will be the target of admin action
  const listTitle = RandomGenerator.paragraph({ sentences: 3 });
  const createdList: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: {
        title: listTitle,
        description: "E2E test generated list",
        visibility: "private",
      } satisfies ITodoAppList.ICreate,
    });
  typia.assert(createdList);

  // 3. Create / authenticate an admin (this will switch connection.headers to admin token)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        role: "moderator",
        href: "http://example.com/admin/signup",
        referrer: "http://referrer.example.com",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 4. As admin, delete the list to generate an admin action
  await api.functional.todoApp.admin.lists.erase(connection, {
    listId: createdList.id,
  });

  // 5. Query admin actions (paginated) and verify the created action is present
  const page: IPageITodoAppAdminAction.ISummary =
    await api.functional.todoApp.admin.adminActions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        // We could filter by createdBefore/After or affectedUserId, but keep simple
      } satisfies ITodoAppAdminAction.IRequest,
    });
  typia.assert(page);

  // Basic pagination metadata checks
  TestValidator.predicate(
    "pagination.current is a non-negative integer",
    typeof page.pagination.current === "number" && page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is a positive integer",
    typeof page.pagination.limit === "number" && page.pagination.limit > 0,
  );

  // 6. Business assertion: find an admin action referencing the deleted list
  const found = page.data.find((a) => a.targetId === createdList.id);
  TestValidator.predicate(
    "admin actions contains an entry referencing the deleted list",
    found !== undefined,
  );

  // If found, validate linkage and admin identity
  if (found) {
    const validated = typia.assert<ITodoAppAdminAction.ISummary>(found);
    // admin.id from auth should equal admin summary in action
    TestValidator.equals(
      "action.admin.id matches performing admin id",
      validated.admin.id,
      admin.id,
    );

    // The targetType (if present) should sensibly mention 'list' when available
    // We avoid strict equality because implementations may use different strings
    TestValidator.predicate(
      "action has createdAt timestamp",
      typeof validated.createdAt === "string" && validated.createdAt.length > 0,
    );
  }
}
