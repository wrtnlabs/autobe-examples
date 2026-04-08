import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todos_search_trash_keyword_completed_sorted(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test trash search with keyword + completion filter + oldestFirst sorting.
   *
   * Validates that a member can create normal todos containing a keyword, bulk-toggle
   * completion so a subset is complete, move only the selected complete todos into trash,
   * and then query PATCH /member/todos with listMode="trash" + completionStatus="complete" +
   * keyword search. Ensures privacy isolation (normal/non-trashed matches do not appear)
   * and verifies stable sorting by createdAt when sortDirection="oldestFirst".
   *
   * 1. Join as an authenticated member.
   * 2. Create 3 todos containing keyword "alpha".
   * 3. Toggle completion so exactly D & F are complete while E remains incomplete.
   * 4. Move D & F to trash.
   * 5. Search trash for completed items matching keyword, sorted oldestFirst.
   * 6. Assert returned set contains only D & F, all are complete and trash-scoped, and
   *    items are ordered by created_at ascending.
   */
  const memberConnection: api.IConnection = { host: connection.host };
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
  // Use only the actor-specific connection that now has authorization headers.
  const userConnection: api.IConnection = memberConnection;
  // 2) Create 3 member-owned normal todos containing keyword "alpha".
  const keyword = "alpha";
  const titleD = `todo alpha ${RandomGenerator.alphabets(8)}`;
  const titleE = `todo alpha ${RandomGenerator.alphabets(8)}`;
  const titleF = `todo alpha ${RandomGenerator.alphabets(8)}`;
  const todoD = await generate_random_multi_user_todo_member_todos_create(
    userConnection,
    {
      body: {
        title: titleD,
        description: `desc ${keyword} ${RandomGenerator.alphabets(6)}`,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoD);
  const todoE = await generate_random_multi_user_todo_member_todos_create(
    userConnection,
    {
      body: {
        title: titleE,
        description: `desc ${keyword} ${RandomGenerator.alphabets(6)}`,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoE);
  const todoF = await generate_random_multi_user_todo_member_todos_create(
    userConnection,
    {
      body: {
        title: titleF,
        description: `desc ${keyword} ${RandomGenerator.alphabets(6)}`,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoF);
  // 3) Bulk-toggle completion so D & F are complete, E remains incomplete.
  const toggledOnce =
    await api.functional.multiUserTodo.member.todos.bulk_toggle_completion.bulkToggleCompletion(
      userConnection,
      {
        body: {
          todoIds: [todoD.id, todoE.id, todoF.id],
          page: 1,
          limit: 100,
        } satisfies IMultiUserTodoTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(toggledOnce);
  const toggledTwice =
    await api.functional.multiUserTodo.member.todos.bulk_toggle_completion.bulkToggleCompletion(
      userConnection,
      {
        body: {
          todoIds: [todoE.id],
          page: 1,
          limit: 100,
        } satisfies IMultiUserTodoTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(toggledTwice);
  // 4) Move exactly D & F into trash.
  const moved =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      userConnection,
      {
        body: {
          ids: [todoD.id, todoF.id],
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(moved);
  TestValidator.equals("movedCount equals 2", moved.movedCount, 2);
  // 5) Search trash + keyword + completion=complete + oldestFirst by createdAt.
  const page = await api.functional.multiUserTodo.member.todos.index(
    userConnection,
    {
      body: {
        listMode: "trash",
        completionStatus: "complete",
        keyword,
        sortBy: "createdAt",
        sortDirection: "oldestFirst",
        page: 1,
        limit: 100,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(page);
  const ids = page.data.map((x) => x.id);
  // 6) Validate business outcomes.
  TestValidator.equals("returned ids count", ids.length, 2);
  TestValidator.equals("contains todoD", ids.includes(todoD.id), true);
  TestValidator.equals("contains todoF", ids.includes(todoF.id), true);
  TestValidator.equals("does not contain todoE", ids.includes(todoE.id), false);
  for (const item of page.data) {
    TestValidator.equals("is_complete", item.is_complete, true);
    TestValidator.predicate("deleted_at present", item.deleted_at !== null);
  }
  // Ordering oldestFirst by created_at.
  const sortedCopy = [...page.data].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  TestValidator.index("oldestFirst order by created_at", sortedCopy, page.data);
}
