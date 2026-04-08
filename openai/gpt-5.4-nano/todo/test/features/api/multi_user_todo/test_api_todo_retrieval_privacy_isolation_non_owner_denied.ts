import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_retrieval_privacy_isolation_non_owner_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test todo retrieval privacy isolation between two members.
   *
   * Validates that Member B cannot retrieve Member A's todo by ID.
   * Ensures the API rejects the request without returning any todo data and
   * without leaking fields such as title/description/lifecycle/edit history.
   *
   * 1. Member A joins and creates a todo.
   * 2. Member B joins separately.
   * 3. Member B attempts to retrieve Member A's todo by todoId.
   * 4. Confirms request is denied and no todo payload is returned.
   */
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.Format<"password"> & tags.MinLength<1>
      >(),
      href: typia.random<string & tags.Format<"uri"> & tags.MinLength<1>>(),
      referrer: typia.random<string & tags.Format<"uri"> & tags.MinLength<1>>(),
      ip: typia.random<string & tags.Format<"ipv4"> & tags.MinLength<1>>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(memberA);
  // 2) Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.Format<"password"> & tags.MinLength<1>
      >(),
      href: typia.random<string & tags.Format<"uri"> & tags.MinLength<1>>(),
      referrer: typia.random<string & tags.Format<"uri"> & tags.MinLength<1>>(),
      ip: typia.random<string & tags.Format<"ipv4"> & tags.MinLength<1>>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(memberB);
  // 3) Member A creates a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4) Member B tries to retrieve Member A's todo by id
  await TestValidator.error(
    "todo retrieval by non-owner should be denied without leaking todo data",
    async () => {
      const output = await api.functional.multiUserTodo.member.todos.at(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
      // If the request succeeds, fail because Member B must not receive
      // any todo payload for a non-owned todo.
      throw new Error(
        `expected request to be rejected, but received todo id=${output.id}`,
      );
    },
  );
}
