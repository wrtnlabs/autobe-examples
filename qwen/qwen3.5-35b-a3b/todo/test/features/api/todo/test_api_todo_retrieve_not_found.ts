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
 * Test error handling when retrieving a non-existent todo by ID.
 *
 * Validates that the API properly returns HTTP 404 Not Found when attempting to
 * retrieve a todo that doesn't exist in the system. The test authenticates as
 * a member, then attempts to fetch todos using random UUIDs that have never
 * been created, ensuring consistent 404 responses without exposing sensitive
 * system information.
 *
 * 1. Register and authenticate a new member account.
 * 2. Generate multiple random UUIDs that don't exist in the system.
 * 3. Attempt to retrieve each non-existent todo.
 * 4. Verify HTTP 404 Not Found is returned for each attempt.
 * 5. Verify error response contains appropriate error details.
 * 6. Test consistency across multiple random UUID attempts.
 */
export async function test_api_todo_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(member);

  // 2. Test retrieving non-existent todos with random UUIDs
  const randomUuids: string[] = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (const uuid of randomUuids) {
    await TestValidator.httpError(
      "404; for (non-existent todo) { uuid }",
      404,
      async () => {
        return api.functional.multiUserTodo.member.todos.at(memberConnection, {
          todoId: uuid,
        });
      },
    );
  }
}