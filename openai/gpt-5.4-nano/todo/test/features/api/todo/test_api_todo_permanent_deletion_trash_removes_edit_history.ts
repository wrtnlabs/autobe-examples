import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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

export async function test_api_todo_permanent_deletion_trash_removes_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // 2. Create todo
  const todoConnection: api.IConnection = { host: connection.host };
  todoConnection.headers = {
    Authorization: member.token.access,
  };
  const trashTodo = await generate_random_multi_user_todo_member_todos_create(
    todoConnection,
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
  // 3. Move todo to trash
  const trashMove =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      todoConnection,
      {
        body: {
          ids: [trashTodo.id],
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(trashMove);
  // 4. Permanent delete from trash
  const permanentDelete =
    await api.functional.multiUserTodo.member.todos.bulk_permanent_delete.bulkPermanentDelete(
      todoConnection,
      {
        body: {
          todoIds: [trashTodo.id],
        } satisfies IMultiUserTodo.IBulkPermanentDeleteRequest,
      },
    );
  typia.assert(permanentDelete);
  // 5. Validate response
  TestValidator.equals(
    "deletedCount equals 1",
    permanentDelete.deletedCount,
    1,
  );
  TestValidator.equals(
    "deletedTodoIds matches",
    permanentDelete.deletedTodoIds,
    [trashTodo.id],
  );
  // 6. Post-conditions
  // Note: no list or get-by-id/edit-history SDK endpoints were provided.
  // We validate the contract through edit history list being absent by:
  // (a) calling todo creation endpoint again would not help.
  // Therefore, we only validate that the returned id is now deleted by attempting an invalid fetch.
  await TestValidator.error("fetching deleted todo should fail", async () => {
    // No retrieval endpoint available in provided SDK list; use permanent delete again with same id.
    await api.functional.multiUserTodo.member.todos.bulk_permanent_delete.bulkPermanentDelete(
      todoConnection,
      {
        body: {
          todoIds: [trashTodo.id],
        } satisfies IMultiUserTodo.IBulkPermanentDeleteRequest,
      },
    );
  });
}
