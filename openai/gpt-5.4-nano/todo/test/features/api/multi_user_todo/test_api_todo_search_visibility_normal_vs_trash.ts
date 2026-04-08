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

export async function test_api_todo_search_visibility_normal_vs_trash(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  /**
   * Test normal vs trash visibility semantics for authenticated member todos.
   *
   * Validates that browsing with trashState=normal returns only non-deleted todos
   * (deleted_at = null), and browsing with trashState=trash returns only soft-deleted
   * todos (deleted_at != null). Also verifies the expected presence/exclusion of the
   * specifically created normal and trashed todos.
   *
   * 1. Create one normal todo (not deleted).
   * 2. Create one todo and erase it to move it into trash.
   * 3. Search normal todos and validate deleted_at/null semantics and ids.
   * 4. Search trash todos and validate deleted_at/not-null semantics and ids.
   */
  // 1. Register and authenticate as a single member.
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(authorized);
  // Create actor-scoped connection using issued access token.
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Create normal todo (not deleted) and trash todo (deleted).
  const normalTodo = await generate_random_multi_user_todo_member_todos_create(
    authConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(normalTodo);
  const trashTodo = await generate_random_multi_user_todo_member_todos_create(
    authConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(trashTodo);
  await api.functional.multiUserTodo.member.todos.erase(authConnection, {
    todoId: trashTodo.id,
  });
  // 3. Search with trashState=normal
  const normalSearch = await api.functional.multiUserTodo.member.todos.search(
    authConnection,
    {
      body: {
        trashState: "normal",
        completionFilter: "all",
        sortBy: "createdAt",
        sortDirection: "newestFirst",
        page: 1,
        limit: 50,
      } satisfies IMultiUserTodo.IRequest,
    },
  );
  typia.assert(normalSearch);
  TestValidator.predicate(
    "normal search should include normal todo",
    normalSearch.data.some((t) => t.id === normalTodo.id),
  );
  TestValidator.predicate(
    "normal search should exclude trashed todo",
    !normalSearch.data.some((t) => t.id === trashTodo.id),
  );
  for (const t of normalSearch.data) {
    TestValidator.equals(
      "normal todo deletedAt should be null",
      t.deleted_at,
      null,
    );
    TestValidator.predicate(
      "normal todo lifecycle_state should be non-empty",
      t.lifecycle_state.length > 0,
    );
  }
  // 5. Search with trashState=trash
  const trashSearch = await api.functional.multiUserTodo.member.todos.search(
    authConnection,
    {
      body: {
        trashState: "trash",
        completionFilter: "all",
        sortBy: "createdAt",
        sortDirection: "newestFirst",
        page: 1,
        limit: 50,
      } satisfies IMultiUserTodo.IRequest,
    },
  );
  typia.assert(trashSearch);
  TestValidator.predicate(
    "trash search should include trashed todo",
    trashSearch.data.some((t) => t.id === trashTodo.id),
  );
  TestValidator.predicate(
    "trash search should exclude normal todo",
    !trashSearch.data.some((t) => t.id === normalTodo.id),
  );
  for (const t of trashSearch.data) {
    TestValidator.predicate(
      "trash todo deletedAt should not be null",
      t.deleted_at !== null,
    );
    TestValidator.predicate(
      "trash todo lifecycle_state should be non-empty",
      t.lifecycle_state.length > 0,
    );
  }
}
