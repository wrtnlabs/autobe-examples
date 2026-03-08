import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(memberConnection, {});
  // Test 1: Pagination with explicit page and limit
  const page1 = await api.functional.todoApp.guest.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(page1);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records positive",
    page1.pagination.records >= 1,
  );
  TestValidator.predicate("page 1 pages positive", page1.pagination.pages >= 1);
  TestValidator.predicate("page 1 data within limit", page1.data.length <= 10);
  // Test 2: Different limit parameter
  const page2 = await api.functional.todoApp.guest.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(page2);
  // Verify new pagination limit
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.predicate("page 2 data within limit", page2.data.length <= 5);
  // Test 3: Default pagination (no parameters)
  const defaultPage = await api.functional.todoApp.guest.sessions.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(defaultPage);
  // Verify default pagination uses page 1
  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit within max",
    defaultPage.pagination.limit <= 100,
  );
  // Test 4: Verify total records consistency across different limits
  TestValidator.equals(
    "total records consistent",
    page1.pagination.records,
    page2.pagination.records,
  );
}
