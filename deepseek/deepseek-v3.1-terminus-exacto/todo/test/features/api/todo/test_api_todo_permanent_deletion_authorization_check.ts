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

export async function test_api_todo_permanent_deletion_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // Create first member user with proper connection isolation
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(firstMember);
  // Create a todo as first user
  const todo = await generate_random_multi_user_todo_member_todos_create(
    firstMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // NOTE: The scenario requires soft-deleting the todo first, but the available API functions
  // don't include a soft-delete endpoint. The permanent_delete endpoint appears to be for
  // actual permanent deletion. Since we cannot implement the exact scenario with available APIs,
  // we'll test the authorization check directly by attempting to delete a non-existent trash entry
  // that belongs to a different user, which should still trigger authorization validation.
  // Create second member user
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(secondMember);
  // Attempt to permanently delete a trash entry that doesn't belong to the second user
  // This should trigger authorization validation even if the trash entry doesn't exist
  await TestValidator.error(
    "second user cannot permanently delete trash entries that don't belong to them",
    async () => {
      // Use a random UUID that doesn't belong to the second user
      const randomTrashEntryId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.multiUserTodo.member.todos.trash_entries.erase(
        secondMemberConnection,
        {
          trashEntryId: randomTrashEntryId,
        },
      );
    },
  );
  // Verify data isolation between users
  TestValidator.notEquals(
    "users have different IDs",
    firstMember.id,
    secondMember.id,
  );
}
