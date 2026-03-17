import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test querying sessions across multiple page requests to validate pagination behavior.
 * First establish a guest session via POST /auth/guest/join to create sufficient session
 * history. Query the first page with a specific limit (e.g., limit=10), then validate
 * the pagination metadata correctly reflects the current page and record counts.
 * Verify that requesting a page beyond the available data returns an empty data array
 * with appropriate pagination metadata showing 0 records for that page.
 */
export async function test_api_guest_session_list_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest
  const guestConnection: api.IConnection = { host: connection.host };
  // Establish guest session - this creates the authentication context
  await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: "https://example.com/todos",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  // Query first page with specific limit
  const firstPage: IPageIMultiUserTodoMemberSession.ISummary =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(firstPage);
  // Validate pagination metadata for first page
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page records >= 0",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages >= 0",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data is array",
    Array.isArray(firstPage.data),
  );
  // Verify pages calculation when records exist
  if (firstPage.pagination.records > 0) {
    const calculatedPages = Math.ceil(
      firstPage.pagination.records / firstPage.pagination.limit,
    );
    TestValidator.equals(
      "first page pages calculation",
      firstPage.pagination.pages,
      calculatedPages,
    );
  }
  // Use a page number far beyond available data
  const beyondPageNumber = 1000;
  // Query page beyond available data
  const beyondPage: IPageIMultiUserTodoMemberSession.ISummary =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        page: beyondPageNumber,
        limit: 10,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(beyondPage);
  // Validate empty data array for page beyond available data
  TestValidator.equals("beyond page data is empty", beyondPage.data.length, 0);
  TestValidator.equals(
    "beyond page current matches request",
    beyondPage.pagination.current,
    beyondPageNumber,
  );
  TestValidator.equals("beyond page limit", beyondPage.pagination.limit, 10);
  TestValidator.equals(
    "beyond page records matches total",
    beyondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.predicate(
    "beyond page pages >= 0",
    beyondPage.pagination.pages >= 0,
  );
}
