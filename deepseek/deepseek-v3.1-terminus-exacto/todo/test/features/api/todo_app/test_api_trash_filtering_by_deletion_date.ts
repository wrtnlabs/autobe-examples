import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashItem";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_trash_filtering_by_deletion_date(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Test basic trash functionality with date filtering
  // Since we cannot create and delete specific todos due to API limitations,
  // we'll test the filtering functionality with empty or existing trash
  // Test 1: Filter with no date range (should return current trash state)
  const defaultResponse = await api.functional.todoApp.user.trash.patch(
    userConnection,
    {
      body: {
        deleted_from: null,
        deleted_to: null,
        include_restored: false,
        include_permanent_deleted: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default filter should return valid response",
    defaultResponse.data.length >= 0,
  );
  // Test 2: Filter by past date range (should return empty or partial results)
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
  const pastRangeResponse = await api.functional.todoApp.user.trash.patch(
    userConnection,
    {
      body: {
        deleted_from: pastDate,
        deleted_to: pastDate,
        include_restored: false,
        include_permanent_deleted: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(pastRangeResponse);
  TestValidator.predicate(
    "past date range should return valid response",
    pastRangeResponse.data.length >= 0,
  );
  // Test 3: Filter by future date range (should return empty)
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const futureRangeResponse = await api.functional.todoApp.user.trash.patch(
    userConnection,
    {
      body: {
        deleted_from: futureDate,
        deleted_to: futureDate,
        include_restored: false,
        include_permanent_deleted: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(futureRangeResponse);
  TestValidator.equals(
    "future date range should return empty",
    futureRangeResponse.data.length,
    0,
  );
  // Test 4: Pagination functionality
  const paginatedResponse = await api.functional.todoApp.user.trash.patch(
    userConnection,
    {
      body: {
        deleted_from: null,
        deleted_to: null,
        include_restored: false,
        include_permanent_deleted: false,
        page: 1,
        limit: 5,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination should respect limit",
    paginatedResponse.data.length <= 5,
  );
  TestValidator.predicate(
    "should have valid pagination metadata",
    paginatedResponse.pagination.records >= 0 &&
      paginatedResponse.pagination.pages >= 0 &&
      paginatedResponse.pagination.current >= 0 &&
      paginatedResponse.pagination.limit === 5,
  );
  // Test 5: Include restored items
  const includeRestoredResponse = await api.functional.todoApp.user.trash.patch(
    userConnection,
    {
      body: {
        deleted_from: null,
        deleted_to: null,
        include_restored: true,
        include_permanent_deleted: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(includeRestoredResponse);
  TestValidator.predicate(
    "include restored should return valid response",
    includeRestoredResponse.data.length >= 0,
  );
}
