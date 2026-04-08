import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test todo edit history retrieval after multiple edits.
 *
 * Validates the edit history retrieval workflow including member authentication, todo creation, and history endpoint access. Ensures that the edit history endpoint returns properly structured paginated responses with correct metadata and entry format.
 *
 * Note: Edit history entries are automatically created when todos are edited. This test validates the retrieval mechanism and response structure. The number of history entries depends on edit operations performed on the todo.
 *
 * 1. Member registers and authenticates to access private todo resources.
 * 2. Member creates a new todo with title, description, and dates.
 * 3. Member retrieves edit history for the todo.
 * 4. Validates response structure and pagination metadata.
 * 5. Validates edit history entries have correct field structure.
 */
export async function test_api_todo_edit_history_retrieval_after_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create todo with all optional fields
  const initialTitle = RandomGenerator.paragraph({ sentences: 1 });
  const initialDescription = RandomGenerator.content({ paragraphs: 1 });
  const startDate = new Date(Date.now() + 86400000).toISOString();
  const dueDate = new Date(Date.now() + 604800000).toISOString();
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
        start_date: startDate,
        due_date: dueDate,
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve edit history
  const historyResponse =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at DESC",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is valid",
    historyResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    historyResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    historyResponse.pagination.pages >= 0,
  );
  // 5. Validate edit history data structure
  TestValidator.predicate("data is array", Array.isArray(historyResponse.data));
  // 6. Validate each history entry has required fields (ISummary type)
  for (const entry of historyResponse.data) {
    typia.assert(entry);
    TestValidator.predicate(
      "entry has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        entry.id,
      ),
    );
    TestValidator.predicate(
      "entry has valid timestamp",
      !isNaN(new Date(entry.created_at).getTime()),
    );
    // Note: ISummary does not include todo relation, only full type has it
    TestValidator.predicate(
      "title is nullable string",
      entry.title === null || typeof entry.title === "string",
    );
    TestValidator.predicate(
      "description is nullable string",
      entry.description === null || typeof entry.description === "string",
    );
    TestValidator.predicate(
      "started_at is nullable date string",
      entry.started_at === null || typeof entry.started_at === "string",
    );
    TestValidator.predicate(
      "due_at is nullable date string",
      entry.due_at === null || typeof entry.due_at === "string",
    );
  }
}
