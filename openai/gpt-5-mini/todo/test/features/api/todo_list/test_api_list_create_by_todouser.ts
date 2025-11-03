import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_create_by_todouser(
  connection: api.IConnection,
) {
  // 1) Register a fresh todoUser and obtain authorization
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Create a todo list (happy path)
  const createBody = {
    title: "Buy groceries",
    description: "Milk, eggs",
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const created: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Persist id for downstream tests
  const createdListId: string = created.id;

  // 3) Business assertions
  TestValidator.equals(
    "created list title matches",
    created.title,
    createBody.title,
  );
  TestValidator.equals(
    "created list description matches",
    created.description,
    createBody.description,
  );
  TestValidator.equals(
    "created list visibility matches",
    created.visibility,
    createBody.visibility,
  );

  // Owner should match the authenticated user
  TestValidator.equals(
    "owner id matches authenticated user",
    created.owner.id,
    authorized.id,
  );

  // typia.assert already validated presence and formats of createdAt/updatedAt

  // 4) Default visibility when omitted -> 'private'
  const createBodyWithoutVisibility = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    // visibility omitted on purpose to verify defaulting
  } satisfies ITodoAppList.ICreate;

  const created2: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: createBodyWithoutVisibility,
    });
  typia.assert(created2);
  TestValidator.equals(
    "default visibility is private",
    created2.visibility,
    "private",
  );

  // 5) Title trimming behavior: send title with surrounding spaces
  const rawTitle = "   My personal list   ";
  const createBodyTrim = {
    title: rawTitle,
    description: "A list with padded title",
  } satisfies ITodoAppList.ICreate;

  const created3: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: createBodyTrim,
    });
  typia.assert(created3);
  TestValidator.equals(
    "title is trimmed by server",
    created3.title,
    rawTitle.trim(),
  );

  // 6) Per-owner uniqueness: creating another list with same title should fail
  await TestValidator.error(
    "creating duplicate title for same owner should fail",
    async () => {
      await api.functional.todoApp.todoUser.lists.create(connection, {
        body: {
          title: createBody.title, // same title as first created list
          description: "Duplicate title attempt",
        } satisfies ITodoAppList.ICreate,
      });
    },
  );

  // Final sanity: ensure captured id is a non-empty string (typia.assert already covered UUID format)
  TestValidator.predicate(
    "created list id non-empty",
    createdListId.length > 0,
  );
}
