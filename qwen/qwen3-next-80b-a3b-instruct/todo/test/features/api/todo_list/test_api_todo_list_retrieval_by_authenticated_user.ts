import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoItem";
import type { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_list_retrieval_by_authenticated_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(userAuth);
  // Step 2: Retrieve todo items (only retrieval endpoint available)
  const response: IPageITodoAppTodoItem.ISummary =
    await api.functional.todoApp.user.todos.index(userConnection, {
      body: {},
    });
  typia.assert(response);
  // Step 3: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has correct structure",
    () =>
      typeof response.pagination.current === "number" &&
      typeof response.pagination.limit === "number" &&
      typeof response.pagination.records === "number" &&
      typeof response.pagination.pages === "number",
  );
  // Step 4: Validate data items structure (only id and title as per ISummary)
  TestValidator.predicate("data items are ISummary", () =>
    response.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.title === "string" &&
        item.title.length <= 255,
    ),
  );
}
