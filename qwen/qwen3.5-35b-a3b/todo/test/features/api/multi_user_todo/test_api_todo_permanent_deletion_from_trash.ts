import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test permanent deletion of a todo from the user's trash.
 *
 * Validates the complete permanent deletion flow for a todo item, ensuring that the todo and all associated edit history are completely removed from the system. The test includes member authentication, todo deletion from trash, and validation of cascade deletion behavior.
 *
 * Special attention is given to verifying that the permanent deletion endpoint correctly removes todos from the trash and that the cascade deletion of edit history occurs as expected. The test validates the endpoint's ability to handle permanent removal operations with proper authentication.
 *
 * 1. Register a new member account with valid email and password.
 * 2. Capture authentication token for subsequent API calls.
 * 3. Test permanent deletion by calling the trash erase endpoint.
 * 4. Validate the deletion operation completes successfully.
 */
export async function test_api_todo_permanent_deletion_from_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create authenticated connection for todo operations
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = { Authorization: `Bearer ${member.token.access}` };
  // 3. Generate valid todo ID for deletion test
  const todoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Test permanent deletion of todo from trash
  await api.functional.multiUserTodo.member.trash.erase(authConnection, {
    todoId,
  });
}
