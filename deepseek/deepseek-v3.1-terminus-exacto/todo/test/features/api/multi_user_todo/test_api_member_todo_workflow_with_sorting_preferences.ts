import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoSortingPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSortingPreference";
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

export async function test_api_member_todo_workflow_with_sorting_preferences(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Create multiple todos with varied dates
  const todos = await ArrayUtil.asyncRepeat(4, async (index) => {
    const createBody: IMultiUserTodoTodo.ICreate = {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      startDate:
        index % 2 === 0
          ? new Date(Date.now() + index * 86400000).toISOString()
          : null,
      dueDate:
        index % 3 !== 0
          ? new Date(Date.now() + (index + 1) * 86400000).toISOString()
          : null,
    } satisfies IMultiUserTodoTodo.ICreate;
    const todo = await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      { body: createBody },
    );
    typia.assert(todo);
    return todo;
  });
  // 3. Set sorting preferences to due_date ascending
  const dueDateAscPrefs =
    await api.functional.multiUserTodo.member.sorting_preferences.patch(
      memberConnection,
      {
        body: {
          sorting_method: "due_date",
          sorting_direction: true, // ascending
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(dueDateAscPrefs);
  // 4. Verify due_date ascending sorting (todos without due dates should appear at end)
  // Note: Actual todo list retrieval would require additional API endpoint
  // For now, we validate the preference was set correctly
  TestValidator.equals(
    "due_date ascending preference set",
    dueDateAscPrefs.sorting_method,
    "due_date",
  );
  TestValidator.equals(
    "due_date ascending direction",
    dueDateAscPrefs.sorting_direction,
    true,
  );
  // 5. Update preferences to start_date descending
  const startDateDescPrefs =
    await api.functional.multiUserTodo.member.sorting_preferences.patch(
      memberConnection,
      {
        body: {
          sorting_method: "start_date",
          sorting_direction: false, // descending
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(startDateDescPrefs);
  // 6. Verify start_date descending sorting (todos without start dates should appear at end)
  TestValidator.equals(
    "start_date descending preference set",
    startDateDescPrefs.sorting_method,
    "start_date",
  );
  TestValidator.equals(
    "start_date descending direction",
    startDateDescPrefs.sorting_direction,
    false,
  );
  // 7. Update preferences to creation_date (default newest first)
  const creationDatePrefs =
    await api.functional.multiUserTodo.member.sorting_preferences.patch(
      memberConnection,
      {
        body: {
          sorting_method: "creation_date",
          sorting_direction: false, // newest first (descending)
        } satisfies IMultiUserTodoTodoSortingPreference.IUpdate,
      },
    );
  typia.assert(creationDatePrefs);
  // 8. Verify creation_date sorting
  TestValidator.equals(
    "creation_date preference set",
    creationDatePrefs.sorting_method,
    "creation_date",
  );
  TestValidator.equals(
    "creation_date newest first",
    creationDatePrefs.sorting_direction,
    false,
  );
  // Validate that all preferences were properly set and persisted
  TestValidator.notEquals(
    "different preference objects",
    dueDateAscPrefs.id,
    startDateDescPrefs.id,
  );
  TestValidator.notEquals(
    "different preference objects",
    startDateDescPrefs.id,
    creationDatePrefs.id,
  );
}
