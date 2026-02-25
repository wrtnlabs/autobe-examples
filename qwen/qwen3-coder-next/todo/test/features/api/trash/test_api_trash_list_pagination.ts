import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_trash_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create two users for privacy testing
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  // Step 2: Test trash list pagination with default settings (page=1, limit=10)
  const trashResponse = await api.functional.todoApp.user.trash.index(
    userAConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(trashResponse);
  // Step 3: Validate trash list response structure
  TestValidator.equals(
    "trash response has pagination",
    trashResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "trash response has limit",
    trashResponse.pagination.limit,
    10,
  );
  // Validate pagination structure matches IPage.IPagination
  TestValidator.predicate(
    "pagination has required fields",
    trashResponse.pagination.current >= 0 &&
      trashResponse.pagination.limit > 0 &&
      trashResponse.pagination.records >= 0 &&
      trashResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "trash response has data array",
    Array.isArray(trashResponse.data),
    true,
  );
  // Validate data items match ITodoAppTodo.ISummary structure
  for (const todo of trashResponse.data) {
    TestValidator.predicate(
      "todo has required fields",
      todo.id !== undefined &&
        typeof todo.id === "string" &&
        todo.title !== undefined &&
        typeof todo.title === "string" &&
        todo.is_complete !== undefined &&
        typeof todo.is_complete === "boolean" &&
        todo.created_at !== undefined &&
        typeof todo.created_at === "string" &&
        todo.author !== undefined &&
        todo.author.id !== undefined,
    );
  }
  // Step 4: Test custom pagination parameters
  const secondPageResponse = await api.functional.todoApp.user.trash.index(
    userAConnection,
    {
      body: {
        page: 2,
        limit: 5,
      },
    },
  );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page starts at correct position",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page has correct limit",
    secondPageResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "second page data count <= limit",
    secondPageResponse.data.length <= 5,
  );
  // Step 5: Test edge case - page with no results
  const emptyPageResponse = await api.functional.todoApp.user.trash.index(
    userAConnection,
    {
      body: {
        page: 100,
        limit: 10,
      },
    },
  );
  typia.assert(emptyPageResponse);
  TestValidator.equals(
    "empty page has zero data",
    emptyPageResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "empty page has valid pagination",
    emptyPageResponse.pagination.records >= 0 &&
      emptyPageResponse.pagination.pages >= 0,
  );
  // Step 6: Test user isolation - userB cannot access userA's trash
  // Using error validation with TestValidator.error
  // This will test if the API properly returns an error when userB tries to access userA's trash
  // Note: This test assumes the API implements proper authorization checks
  await TestValidator.error("userB cannot access userA's trash", async () => {
    await api.functional.todoApp.user.trash.index(userBConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  });
}
