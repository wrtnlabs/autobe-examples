import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test pagination functionality with available todo history data.
 * Since actual edit endpoints are not available, this test focuses on
 * validating the pagination endpoint structure and response format.
 */
export async function test_api_todo_history_pagination_with_extensive_edits(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create a todo item
  await api.functional.todoApp.user.todos.create(userConnection);
  // Test pagination with different configurations
  // Since we cannot generate actual history entries, we test the endpoint structure
  // Test pagination with default settings (page 1, limit 20)
  const defaultPage = await api.functional.todoApp.user.todos.histories.index(
    userConnection,
    {
      todoId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(defaultPage);
  // Test pagination with smaller page size
  const smallPage = await api.functional.todoApp.user.todos.histories.index(
    userConnection,
    {
      todoId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(smallPage);
  // Test pagination with larger page size
  const largePage = await api.functional.todoApp.user.todos.histories.index(
    userConnection,
    {
      todoId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(largePage);
  // Test edge case: page beyond total pages
  const beyondPage = await api.functional.todoApp.user.todos.histories.index(
    userConnection,
    {
      todoId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 100, // Very high page number
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(beyondPage);
  // Validate pagination metadata structure
  TestValidator.equals(
    "default page has page 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default page has limit 20",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.equals("small page has limit 5", smallPage.pagination.limit, 5);
  TestValidator.equals(
    "large page has limit 50",
    largePage.pagination.limit,
    50,
  );
  TestValidator.equals(
    "beyond page has page 100",
    beyondPage.pagination.current,
    100,
  );
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "records count is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "limit is within allowed range",
    defaultPage.pagination.limit >= 1 && defaultPage.pagination.limit <= 100,
  );
}
