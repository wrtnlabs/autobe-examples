import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistory";
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
 * Test edit history access control between two member accounts.
 * 1. Create Member A account and create a todo
 * 2. Member A edits todo to generate edit history
 * 3. Create Member B account for unauthorized access testing
 * 4. Member B attempts to access Member A's todo edit history (should fail)
 * 5. Member B creates own todo and successfully accesses its edit history
 * 6. Validate data isolation boundaries
 */
export async function test_api_todo_edit_history_access_control(
  connection: api.IConnection,
): Promise<void> {
  // PHASE 1: Member A setup and todo creation
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuthorized);
  const memberATodo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(memberATodo);
  // Member A edits todo to create edit history
  const memberAUpdate = await api.functional.multiUserTodo.member.todos.update(
    memberAConnection,
    {
      todoId: memberATodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(memberAUpdate);
  // PHASE 2: Member B setup and unauthorized access test
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuthorized);
  // Member B attempts to access Member A's todo edit history (should fail)
  await TestValidator.error(
    "Member B cannot access Member A's todo edit history",
    async () => {
      await api.functional.multiUserTodo.member.todos.edit_histories.index(
        memberBConnection,
        {
          todoId: memberATodo.id,
          body: {
            page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
            limit: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies IMultiUserTodoEditHistory.IRequest,
        },
      );
    },
  );
  // PHASE 3: Member B creates own todo and accesses its edit history
  const memberBTodo = await generate_random_multi_user_todo_member_todos_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(memberBTodo);
  // Member B successfully accesses own todo edit history
  const memberBHistory =
    await api.functional.multiUserTodo.member.todos.edit_histories.index(
      memberBConnection,
      {
        todoId: memberBTodo.id,
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IMultiUserTodoEditHistory.IRequest,
      },
    );
  typia.assert(memberBHistory);
  // Validate pagination structure
  TestValidator.predicate(
    "Member B history has valid pagination structure",
    () =>
      memberBHistory.pagination.current >= 0 &&
      memberBHistory.pagination.limit >= 0 &&
      memberBHistory.pagination.records >= 0 &&
      memberBHistory.pagination.pages >= 0,
  );
  // New todo should have empty edit history
  TestValidator.equals(
    "New todo has no edit history",
    memberBHistory.data.length,
    0,
  );
  // PHASE 4: Data isolation validation
  TestValidator.notEquals(
    "Member A and Member B have different IDs",
    memberAAuthorized.id,
    memberBAuthorized.id,
  );
  TestValidator.notEquals(
    "Member A and Member B todos have different IDs",
    memberATodo.id,
    memberBTodo.id,
  );
}
