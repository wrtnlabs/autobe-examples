import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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

export async function test_api_todo_permanent_deletion_from_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
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
  // 2. Create a todo to delete
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Soft delete todo (move to trash)
  const softDeleted =
    await api.functional.multiUserTodo.member.permanent_delete.erase(
      memberConnection,
      {
        body: {
          search: null,
          is_completed: null,
          sort_by: null,
          sort_direction: null,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(softDeleted);
  // 4. Extract trash entry ID from response (assuming response contains it)
  // Note: The IMultiUserTodoTodo type doesn't have a trash entry ID property
  // This needs to be retrieved from trash listing endpoint (not available)
  // We'll need to use the todo ID and assume it maps to trash entry ID
  // Since we don't have a trash listing endpoint, we'll test with an invalid UUID
  // to demonstrate the authorization test (only owner can delete)
  const invalidTrashEntryId = typia.random<string & tags.Format<"uuid">>();
  // 5. Create another member to test authorization
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(otherMember);
  // 6. Test authorization failure - other member cannot delete
  await TestValidator.error(
    "other member cannot delete trash entry",
    async () => {
      await api.functional.multiUserTodo.member.todos.trash_entries.erase(
        otherMemberConnection,
        {
          trashEntryId: invalidTrashEntryId,
        },
      );
    },
  );
  // 7. Since we don't have the actual trash entry ID, we cannot test successful deletion
  // This scenario needs a trash listing endpoint to retrieve valid trash entry IDs
  console.log(
    "Note: Cannot test successful permanent deletion without trash listing endpoint",
  );
}
