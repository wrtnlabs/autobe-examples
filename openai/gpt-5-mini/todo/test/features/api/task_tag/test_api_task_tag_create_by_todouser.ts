import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_task_tag_create_by_todouser(
  connection: api.IConnection,
) {
  /**
   * Test scenario:
   *
   * 1. Register a fresh todoUser via POST /auth/todoUser/join to obtain auth token
   * 2. Create a task tag with unnormalized name (surrounding whitespace + mixed
   *    case)
   * 3. Assert created entity (typia.assert) and business properties (normalized
   *    name, timestamps)
   * 4. Attempt to create the same tag again and expect a business-level error
   *    (uniqueness enforcement)
   *
   * Notes:
   *
   * - Use only provided DTOs and SDK functions
   * - Do not manipulate connection.headers manually (SDK handles Authorization)
   */

  // 1) Register a fresh todoUser (join)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joined: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: userEmail,
        password: "P4ssword!",
        displayName: RandomGenerator.name(),
        href: "http://localhost/signup",
        referrer: "http://localhost/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(joined);

  // The SDK sets connection.headers.Authorization automatically from join response.

  // 2) Create a tag with unnormalized name to verify trimming and normalization
  const rawName = "  Urgent  ";
  const created: ITodoAppTaskTag =
    await api.functional.todoApp.todoUser.taskTags.create(connection, {
      body: {
        name: rawName,
      } satisfies ITodoAppTaskTag.ICreate,
    });
  // Validate response shape and tags
  typia.assert(created);

  // Business validations
  TestValidator.predicate(
    "created tag has id",
    created.id !== null && created.id !== undefined,
  );
  TestValidator.equals(
    "created tag name normalized to lowercase and trimmed",
    created.name,
    "urgent",
  );
  TestValidator.predicate(
    "created tag has createdAt timestamp",
    created.createdAt !== null && created.createdAt !== undefined,
  );
  TestValidator.predicate(
    "created tag has updatedAt timestamp",
    created.updatedAt !== null && created.updatedAt !== undefined,
  );

  // 3) Business-logic negative case: duplicate creation should fail (uniqueness)
  await TestValidator.error(
    "creating duplicate tag name should fail",
    async () => {
      await api.functional.todoApp.todoUser.taskTags.create(connection, {
        body: {
          // Use the exact same logical name (may be normalized server-side)
          name: "urgent",
        } satisfies ITodoAppTaskTag.ICreate,
      });
    },
  );
}
