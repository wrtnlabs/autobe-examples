import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import type { IPageIMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserProfile";
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

export async function test_api_todo_search_privacy_isolation_across_members(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      display_name: "memberA-privacy",
    },
  });
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      display_name: "memberB-privacy",
    },
  });
  typia.assert(memberA);
  typia.assert(memberB);
  const distinctiveKeyword = `kw-${RandomGenerator.alphabets(10)}`;
  const memberATodoMatching =
    await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
      {
        body: {
          title: `todo-A-${distinctiveKeyword}`,
          description: `desc-A-${distinctiveKeyword}`,
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
  typia.assert(memberATodoMatching);
  await generate_random_multi_user_todo_member_todos_create(memberAConnection, {
    body: {
      title: `todo-A-${RandomGenerator.alphabets(12)}`,
      description: `desc-A-${RandomGenerator.alphabets(20)}`,
    } satisfies IMultiUserTodoTodo.ICreate,
  });
  const memberBMatchingTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberBConnection,
      {
        body: {
          title: `todo-B-${distinctiveKeyword}`,
          description: `desc-B-${RandomGenerator.alphabets(16)}`,
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
  typia.assert(memberBMatchingTodo);
  // 4) Authenticate as Member A and search normal todos by keyword.
  const memberASearchNormal =
    await api.functional.multiUserTodo.member.todos.search(memberAConnection, {
      body: {
        searchText: distinctiveKeyword,
        trashState: "normal",
        completionFilter: "all",
        sortBy: "createdAt",
        sortDirection: "newestFirst",
        page: 1,
        limit: 50,
      } satisfies IMultiUserTodo.IRequest,
    });
  typia.assert(memberASearchNormal);
  const memberAIds = new Set<string>([memberATodoMatching.id]);

  TestValidator.predicate(
    "normal search must not leak Member B todo",
    () =>
      memberASearchNormal.data.every(
        (todo) => todo.id !== memberBMatchingTodo.id,
      ),
  );

  TestValidator.predicate(
    "normal search results are scoped to Member A and are not soft-deleted",
    () =>
      memberASearchNormal.data.every(
        (todo) => memberAIds.has(todo.id) && todo.deleted_at === null,
      ),
  );

  TestValidator.predicate(
    "Member A matching todo must appear in normal results",
    () => memberASearchNormal.data.some((t) => t.id === memberATodoMatching.id),
  );

  // 6) Repeat search as Member A for trash todos.
  const memberASearchTrash =
    await api.functional.multiUserTodo.member.todos.search(memberAConnection, {
      body: {
        searchText: distinctiveKeyword,
        trashState: "trash",
        completionFilter: "all",
        sortBy: "createdAt",
        sortDirection: "newestFirst",
        page: 1,
        limit: 50,
      } satisfies IMultiUserTodo.IRequest,
    });
  typia.assert(memberASearchTrash);

  TestValidator.predicate(
    "trash search must not leak Member B todo",
    () =>
      memberASearchTrash.data.every(
        (todo) => todo.id !== memberBMatchingTodo.id,
      ),
  );

  TestValidator.predicate(
    "trash search results are scoped to Member A and are soft-deleted (never permanently deleted)",
    () =>
      memberASearchTrash.data.every(
        (todo) => memberAIds.has(todo.id) && todo.deleted_at !== null,
      ),
  );
}
