import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_detail_deleted_todo_hidden(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a soft-deleted todo is hidden from the member detail endpoint.
   *
   * Verifies the private todo lifecycle around delete-to-trash behavior by
   * creating a member-owned todo, moving it to trash, and confirming that the
   * detail read endpoint no longer returns the active record while the todo is
   * deleted. The scenario checks that soft-deleted todos remain inaccessible
   * from the standard read route until restoration, preserving privacy and the
   * expected trash semantics.
   *
   * 1. Register an authenticated private member session.
   * 2. Create a member-owned todo with a unique title and content.
   * 3. Soft-delete the todo into trash.
   * 4. Confirm the detail endpoint does not expose the deleted record.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  const created = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: created.id,
  });
  await TestValidator.httpError(
    "deleted todo detail should be hidden from active reads",
    404,
    async () => {
      await api.functional.todoApp.member.todos.at(memberConnection, {
        todoId: created.id,
      });
    },
  );
}
