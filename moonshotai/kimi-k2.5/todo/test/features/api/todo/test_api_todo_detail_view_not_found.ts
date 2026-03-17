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

/**
 * Test security behavior when attempting to access a non-existent todo.
 * A member registers and attempts to retrieve details for a todo using a randomly generated UUID that does not exist in the system. Verify the system returns HTTP 404 with a 'not found' error message. This validates the error handling for missing resources and ensures the endpoint properly handles invalid todoId values without exposing internal information.
 */
export async function test_api_todo_detail_view_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Generate a random UUID that doesn't exist
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to access non-existent todo - should return HTTP 404
  await TestValidator.httpError(
    "should return 404 for non-existent todo",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.at(memberConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
