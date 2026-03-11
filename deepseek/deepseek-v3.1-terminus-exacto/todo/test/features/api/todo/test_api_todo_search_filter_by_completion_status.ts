import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_search_filter_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.local",
      referrer: "https://test.local/referrer",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create test todos (all will be incomplete by default since no update API)
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // 3. Test search with different completion filters
  // All should work without error even though we can't control completion status
  // Test with null (all todos)
  const nullFilterResponse =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        is_completed: null,
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(nullFilterResponse);
  // Test with false (incomplete todos only)
  const falseFilterResponse =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        is_completed: false,
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(falseFilterResponse);
  // Test with true (completed todos only) - will likely return empty since all are incomplete
  const trueFilterResponse =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        is_completed: true,
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(trueFilterResponse);
  // 4. Validate response structure and pagination
  TestValidator.predicate(
    "null filter has pagination",
    nullFilterResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "false filter has pagination",
    falseFilterResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "true filter has pagination",
    trueFilterResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "null filter has data array",
    Array.isArray(nullFilterResponse.data),
  );
  TestValidator.predicate(
    "false filter has data array",
    Array.isArray(falseFilterResponse.data),
  );
  TestValidator.predicate(
    "true filter has data array",
    Array.isArray(trueFilterResponse.data),
  );
  // 5. Validate todo summary fields from any response that has data
  if (nullFilterResponse.data.length > 0) {
    const summary = nullFilterResponse.data[0];
    TestValidator.predicate("todo summary has id", "id" in summary);
    TestValidator.predicate("todo summary has title", "title" in summary);
    TestValidator.predicate(
      "todo summary has is_completed",
      "is_completed" in summary,
    );
    TestValidator.predicate(
      "todo summary has created_at",
      "created_at" in summary,
    );
  }
  // 6. Business logic validation: Since all created todos are incomplete,
  // false filter should return same or similar count as null filter
  // true filter should return 0 or fewer items
  TestValidator.predicate(
    "incomplete filter returns valid subset",
    falseFilterResponse.pagination.records <=
      nullFilterResponse.pagination.records,
  );
}
