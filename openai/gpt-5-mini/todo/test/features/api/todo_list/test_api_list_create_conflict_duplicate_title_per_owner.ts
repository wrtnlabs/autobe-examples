import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_create_conflict_duplicate_title_per_owner(
  connection: api.IConnection,
) {
  // 1. Prepare two isolated connection objects for two users (owner and other)
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };

  // 2. Register / authorize the owner user
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, {
      body: {
        email: ownerEmail,
        password: "password123", // min length 8
        href: "https://example.com/signup",
        referrer: "https://example.com/",
        displayName: RandomGenerator.name(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(ownerAuth);

  // 3. Register / authorize the other user
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(otherConn, {
      body: {
        email: otherEmail,
        password: "password123",
        href: "https://example.com/signup",
        referrer: "https://example.com/",
        displayName: RandomGenerator.name(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(otherAuth);

  // Shared test data
  const title = "Project Board";
  const description = RandomGenerator.paragraph({ sentences: 6 });

  // 4. Owner creates the initial list (should succeed)
  const created: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(ownerConn, {
      body: {
        title,
        description,
        visibility: "private",
      } satisfies ITodoAppList.ICreate,
    });
  typia.assert(created);

  // Basic business assertions on created list
  TestValidator.equals(
    "created list has requested title",
    created.title,
    title,
  );
  TestValidator.predicate("created list has owner id", !!created.owner?.id);
  TestValidator.equals(
    "created list visibility is private",
    created.visibility,
    "private",
  );

  // 5. Owner attempts to create another list with the SAME title -> expect 409
  await TestValidator.httpError(
    "creating duplicate list title for same owner should fail with 409",
    409,
    async () => {
      await api.functional.todoApp.todoUser.lists.create(ownerConn, {
        body: {
          title,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "private",
        } satisfies ITodoAppList.ICreate,
      });
    },
  );

  // 6. Other user creates a list with the SAME title -> should succeed
  const otherCreated: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(otherConn, {
      body: {
        title,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        visibility: "private",
      } satisfies ITodoAppList.ICreate,
    });
  typia.assert(otherCreated);

  // Validate that the other user's list has the same title but different owner id
  TestValidator.equals(
    "other user's created list has requested title",
    otherCreated.title,
    title,
  );
  TestValidator.predicate(
    "other user's list owner differs from owner",
    otherCreated.owner.id !== created.owner.id,
  );
}
