import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_permanent_delete_from_trash_requires_trash_location(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  const todoKeep: IMultiUserTodoEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(todoKeep);
  const todoTrashed: IMultiUserTodoEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(todoTrashed);
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todoTrashed.id,
  });
  await api.functional.multiUserTodo.member.trash.erase(memberConnection, {
    todoId: todoTrashed.id,
  });
  await TestValidator.error(
    "should reject permanent deletion for non-trashed todo",
    async () => {
      await api.functional.multiUserTodo.member.trash.erase(memberConnection, {
        todoId: todoKeep.id,
      });
    },
  );
  await TestValidator.error(
    "trashed todo should be removed from trash view",
    async () => {
      const trashView = await api.functional.multiUserTodo.member.trash.at(
        memberConnection,
        {
          todoId: todoTrashed.id,
        },
      );
      typia.assert(trashView);
    },
  );
  await TestValidator.error(
    "trashed todo should be removed from normal todo details",
    async () => {
      const normalView = await api.functional.multiUserTodo.member.todos.at(
        memberConnection,
        {
          todoId: todoTrashed.id,
        },
      );
      typia.assert(normalView);
    },
  );
  const keptNormalView = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    {
      todoId: todoKeep.id,
    },
  );
  typia.assert(keptNormalView);
  TestValidator.equals("kept todo id matches", keptNormalView.id, todoKeep.id);
  await TestValidator.error(
    "non-trashed todo should be rejected from trash view",
    async () => {
      const trashView = await api.functional.multiUserTodo.member.trash.at(
        memberConnection,
        {
          todoId: todoKeep.id,
        },
      );
      typia.assert(trashView);
    },
  );
}
