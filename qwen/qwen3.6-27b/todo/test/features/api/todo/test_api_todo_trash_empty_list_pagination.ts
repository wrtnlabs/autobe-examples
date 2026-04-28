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

/**
 * Test trash endpoint returns empty paginated list for member with no soft-deleted todos.
 *
 * Validates that a freshly registered member who has not created or deleted any todos receives a properly structured empty paginated response from the trash list endpoint. Ensures pagination metadata is correct with zero records and empty data array.
 *
 * Special attention is given to verifying that the pagination fields (current, limit, records, pages) are all present and correctly reflect an empty state, and that the data array is empty rather than null or undefined.
 *
 * 1. Register and authenticate a new member with random credentials.
 * 2. Retrieve trash list without creating any todos.
 * 3. Validate pagination metadata shows zero records and empty array.
 */
export async function test_api_todo_trash_empty_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Retrieve trash list (no todos created, so trash is empty)
  const body = {} satisfies ITodoAppTodo.ITrashRequest;
  const trashList = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    { body },
  );
  typia.assert(trashList);
  // 3. Validate pagination metadata for empty state
  TestValidator.equals(
    "records count is zero",
    trashList.pagination.records,
    0,
  );
  TestValidator.equals("pages count is zero", trashList.pagination.pages, 0);
  TestValidator.equals("current page is 1", trashList.pagination.current, 1);
  TestValidator.predicate("limit is positive", trashList.pagination.limit > 0);
  TestValidator.predicate("data array is empty", trashList.data.length === 0);
}
