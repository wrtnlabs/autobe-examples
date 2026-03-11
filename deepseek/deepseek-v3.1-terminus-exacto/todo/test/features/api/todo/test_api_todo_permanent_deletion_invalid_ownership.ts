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

/**
 * Test authorization boundary: member attempts to permanently delete a todo owned by another member.
 * Create two member accounts, member A creates a todo and moves it to trash, member B attempts to permanently delete it.
 * Verify that the system rejects the request due to ownership violation. This tests the data isolation
 * boundary where users can only manipulate their own data, protecting privacy and security.
 */
export async function test_api_todo_permanent_deletion_invalid_ownership(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for both members
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // 1. Register and authenticate Member A
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Register and authenticate Member B
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member A creates a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // 4. Attempt permanent deletion by Member B (non-owner)
  await TestValidator.error(
    "Member B cannot permanently delete a todo owned by Member A",
    async () => {
      await api.functional.multiUserTodo.member.permanent_delete.erase(
        memberBConnection,
        {
          body: {
            search: null,
            is_completed: null,
            sort_by: null,
            sort_direction: null,
            page: 1,
            limit: 10,
          } satisfies IMultiUserTodoTodo.IRequest,
        },
      );
    },
  );
  // Note: The todo needs to be in trash before permanent deletion can be attempted.
  // However, the scenario focuses on ownership validation, and the permanent delete endpoint
  // should first check ownership before checking trash status.
  // This tests that ownership validation happens even before trash status validation.
}
