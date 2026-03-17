import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodo";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

/**
 * Test that members can only view their own todos, enforcing strict data privacy boundaries.
 *
 * This test validates complete data isolation between member accounts:
 * 1. Each member can only view their own todos
 * 2. The system automatically filters by authenticated user
 * 3. No cross-member data access is possible
 * 4. Search/filtering cannot bypass data isolation
 */
export async function test_api_todo_list_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // Step 1: Create Member A and their todos
  // ========================================
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // Create 3 todos for Member A with unique identifiable titles
  const memberATodoIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const todo = await generate_random_private_todo_app_member_todos_create(
      memberAConnection,
      {
        body: {
          title: `Member A Todo ${RandomGenerator.alphabets(8)}`,
        },
      },
    );
    typia.assert(todo);
    memberATodoIds.push(todo.id);
  }
  // ========================================
  // Step 2: Create Member B and their todos
  // ========================================
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // Create 4 todos for Member B with different unique titles
  const memberBTodoIds: string[] = [];
  for (let i = 0; i < 4; i++) {
    const todo = await generate_random_private_todo_app_member_todos_create(
      memberBConnection,
      {
        body: {
          title: `Member B Task ${RandomGenerator.alphabets(8)}`,
        },
      },
    );
    typia.assert(todo);
    memberBTodoIds.push(todo.id);
  }
  // ========================================
  // Step 3: Verify Member B can only see their own todos
  // ========================================
  const memberBTodoList =
    await api.functional.privateTodoApp.member.todos.index(memberBConnection, {
      body: {} satisfies IPrivateTodoAppTodo.IRequest,
    });
  typia.assert(memberBTodoList);
  // Validate record count matches Member B's todos
  TestValidator.equals(
    "Member B todo count matches created count",
    memberBTodoList.pagination.records,
    memberBTodoIds.length,
  );
  // Verify all returned todos belong to Member B
  const memberBReturnedIds = memberBTodoList.data.map((todo) => todo.id);
  TestValidator.predicate(
    "All Member B's todos are present",
    memberBTodoIds.every((id) => memberBReturnedIds.includes(id)),
  );
  // Verify none of Member A's todos appear in Member B's list
  TestValidator.predicate(
    "None of Member A's todos appear in Member B's list",
    memberATodoIds.every((id) => !memberBReturnedIds.includes(id)),
  );
  // ========================================
  // Step 4: Verify Member A can only see their own todos
  // ========================================
  const memberATodoList =
    await api.functional.privateTodoApp.member.todos.index(memberAConnection, {
      body: {} satisfies IPrivateTodoAppTodo.IRequest,
    });
  typia.assert(memberATodoList);
  // Validate record count matches Member A's todos
  TestValidator.equals(
    "Member A todo count matches created count",
    memberATodoList.pagination.records,
    memberATodoIds.length,
  );
  // Verify all returned todos belong to Member A
  const memberAReturnedIds = memberATodoList.data.map((todo) => todo.id);
  TestValidator.predicate(
    "All Member A's todos are present",
    memberATodoIds.every((id) => memberAReturnedIds.includes(id)),
  );
  // Verify none of Member B's todos appear in Member A's list
  TestValidator.predicate(
    "None of Member B's todos appear in Member A's list",
    memberBTodoIds.every((id) => !memberAReturnedIds.includes(id)),
  );
  // ========================================
  // Step 5: Test search isolation - Member B searches for Member A's todo titles
  // ========================================
  // Get Member A's todo titles for search test
  const memberATodoListForSearch =
    await api.functional.privateTodoApp.member.todos.index(memberAConnection, {
      body: {} satisfies IPrivateTodoAppTodo.IRequest,
    });
  typia.assert(memberATodoListForSearch);
  // Use Member A's first todo title as search term
  const memberASearchTerm = memberATodoListForSearch.data[0].title.substring(
    0,
    8,
  );
  // Member B searches with Member A's todo title
  const memberBSearchResults =
    await api.functional.privateTodoApp.member.todos.index(memberBConnection, {
      body: {
        search: memberASearchTerm,
      } satisfies IPrivateTodoAppTodo.IRequest,
    });
  typia.assert(memberBSearchResults);
  // Verify search results still only contain Member B's todos
  const searchResultIds = memberBSearchResults.data.map((todo) => todo.id);
  TestValidator.predicate(
    "Search results contain no Member A todos",
    memberATodoIds.every((id) => !searchResultIds.includes(id)),
  );
  // If there are results, they must all be Member B's todos
  if (memberBSearchResults.data.length > 0) {
    TestValidator.predicate(
      "Search results only contain Member B's todos",
      searchResultIds.every((id) => memberBTodoIds.includes(id)),
    );
  }
}
