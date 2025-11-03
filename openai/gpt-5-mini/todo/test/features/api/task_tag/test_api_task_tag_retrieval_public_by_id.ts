import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_task_tag_retrieval_public_by_id(
  connection: api.IConnection,
) {
  /**
   * 1. Register a todoUser (authenticated actor) to create a tag. The SDK call
   *    will populate connection.headers.Authorization automatically.
   */
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    displayName: RandomGenerator.name(),
    href: "https://example.test/join",
    referrer: "https://example.test/ref",
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userBody,
    });
  typia.assert(authorized);

  /** 2. Create a canonical task tag as the authenticated todoUser. */
  const createBody = { name: "BuyListTag" } satisfies ITodoAppTaskTag.ICreate;
  const createdTag: ITodoAppTaskTag =
    await api.functional.todoApp.todoUser.taskTags.create(connection, {
      body: createBody,
    });
  typia.assert(createdTag);

  /**
   * 3. Retrieve the tag as an unauthenticated client (public endpoint). Create a
   *    new connection object with empty headers to ensure no auth.
   */
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const retrieved: ITodoAppTaskTag = await api.functional.todoApp.taskTags.at(
    unauthConn,
    { tagId: createdTag.id },
  );
  typia.assert(retrieved);

  // Business-level assertions
  TestValidator.equals("retrieved tag id matches", retrieved.id, createdTag.id);
  TestValidator.equals(
    "retrieved tag name matches normalized",
    retrieved.name,
    createdTag.name,
  );
  TestValidator.predicate(
    "createdAt present",
    retrieved.createdAt !== null && retrieved.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt present",
    retrieved.updatedAt !== null && retrieved.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "deletedAt is absent",
    retrieved.deletedAt === null || retrieved.deletedAt === undefined,
  );

  /**
   * 4. Business-not-found: valid UUID that does not exist should be treated as
   *    not-found
   */
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent tag returns error", async () => {
    await api.functional.todoApp.taskTags.at(unauthConn, {
      tagId: nonExistentId,
    });
  });
}
