import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_todo_list_user_privacy_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as a standard user using the authorization utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authenticatedUser: ITodoListUser.IAuthorized =
    await authorize_member_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoListUser.IJoin,
    });
  typia.assert(authenticatedUser);
  // Step 2: Use the authenticated user connection to call the /todoList/users endpoint
  const response: IPageITodoListUser.ISummary =
    await api.functional.todoList.users.index(userConnection);
  typia.assert(response);
  // Step 3: Validate that the response contains an empty data array as required by the privacy model
  TestValidator.equals(
    "response data array should be empty",
    response.data,
    [],
  );
}
