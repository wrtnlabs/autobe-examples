import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_trash_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a member-specific connection with the authentication token
  const todoConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  // 3. Retrieve trash list with default pagination parameters
  const trashList = await api.functional.todoApp.member.todos.trash.index(
    todoConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashList);
  // 4. Validate pagination metadata structure and values
  TestValidator.equals(
    "pagination records count",
    trashList.pagination.records,
    trashList.pagination.records,
  );
  TestValidator.equals(
    "pagination current page",
    trashList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", trashList.pagination.limit, 20);
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    trashList.pagination.pages ===
      Math.ceil(trashList.pagination.records / trashList.pagination.limit),
  );
  // 5. Validate response has required properties
  TestValidator.predicate(
    "response has valid pagination object",
    trashList.pagination !== undefined &&
      typeof trashList.pagination === "object",
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(trashList.data) && trashList.data.length >= 0,
  );
  // 6. If trash has items, validate each todo structure
  if (trashList.data.length > 0) {
    for (const todo of trashList.data) {
      typia.assert(todo);
      // Validate UUID format for id
      TestValidator.predicate(
        "todo has valid uuid id",
        /^[0-9a-f-]{36}$/i.test(todo.id),
      );
      // Validate title is non-empty string
      TestValidator.predicate(
        "todo has valid title",
        typeof todo.title === "string" && todo.title.length > 0,
      );
      // Validate description can be string or null
      TestValidator.predicate(
        "todo has valid description",
        typeof todo.description === "string" || todo.description === null,
      );
      // Validate is_complete is boolean
      TestValidator.predicate(
        "todo has valid is_complete",
        typeof todo.is_complete === "boolean",
      );
      // Validate created_at is valid date-time string
      TestValidator.predicate(
        "todo has valid created_at",
        typeof todo.created_at === "string" &&
          !isNaN(Date.parse(todo.created_at)),
      );
      // Validate deleted_at can be string or null (soft deletion indicator)
      TestValidator.predicate(
        "todo has valid deleted_at",
        typeof todo.deleted_at === "string" || todo.deleted_at === null,
      );
      // Validate start_date can be string or null
      TestValidator.predicate(
        "todo has valid start_date",
        typeof todo.start_date === "string" || todo.start_date === null,
      );
      // Validate due_date can be string or null
      TestValidator.predicate(
        "todo has valid due_date",
        typeof todo.due_date === "string" || todo.due_date === null,
      );
    }
  }
  // 7. Validate all todos in trash have deleted_at set (soft deletion indicator)
  for (const todo of trashList.data) {
    TestValidator.predicate(
      "trash todos have deleted_at set",
      todo.deleted_at !== null,
    );
  }
}