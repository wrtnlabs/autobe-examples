import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_admin_list_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1) Create a new todoUser (owner)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const todoUser = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: userEmail,
      password: "P@ssw0rd123",
      displayName: RandomGenerator.name(),
      href: "http://example.com/signup",
      referrer: "http://example.com/",
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(todoUser);

  // 2) Create a list as that todoUser (SDK automatically attached user's token)
  const createListBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const list = await api.functional.todoApp.todoUser.lists.create(connection, {
    body: createListBody,
  });
  typia.assert(list);

  // Validate ownership
  TestValidator.equals(
    "created list owner matches todoUser id",
    list.owner.id,
    todoUser.id,
  );

  // 3) Create a new admin account (this will replace connection.headers.Authorization with admin token)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass!234",
      display_name: RandomGenerator.name(),
      role: "superadmin",
      href: "http://example.com/admin/signup",
      referrer: "http://example.com/",
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(admin);

  // 4) As admin, soft-delete (erase) the list
  await api.functional.todoApp.admin.lists.erase(connection, {
    listId: list.id,
  });

  // The call succeeded if no exception was thrown. Assert via predicate.
  TestValidator.predicate("admin erase completed without throwing", true);

  // 5) Attempt to delete again and expect an error (list already deleted -> not found / invalid)
  await TestValidator.error(
    "deleting already deleted list should fail",
    async () => {
      await api.functional.todoApp.admin.lists.erase(connection, {
        listId: list.id,
      });
    },
  );
}
