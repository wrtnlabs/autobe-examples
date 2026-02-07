import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination boundary conditions and edge cases for security events endpoint.
 * Validates first page retrieval, last page calculation, empty results for out-of-bounds pages,
 * limit parameter validation, default pagination values, and large page number handling.
 */
export async function test_api_security_events_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test first page retrieval with various limit values
  const limitValues = [1, 10, 50, 100] as const;
  for (const limit of limitValues) {
    const firstPage =
      await api.functional.discussionBoard.admin.security_events.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardSecurityEvent.IRequest,
        },
      );
    typia.assert(firstPage);
    TestValidator.equals(
      `limit ${limit} - current page`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit ${limit} - limit`,
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit} - pages non-negative`,
      firstPage.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `limit ${limit} - records non-negative`,
      firstPage.pagination.records >= 0,
    );
  }
  // 3. Test last page calculation
  const totalRecords =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(totalRecords);
  if (totalRecords.pagination.pages > 0) {
    const lastPage =
      await api.functional.discussionBoard.admin.security_events.index(
        adminConnection,
        {
          body: {
            page: totalRecords.pagination.pages,
            limit: 10,
          } satisfies IDiscussionBoardSecurityEvent.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page number",
      lastPage.pagination.current,
      totalRecords.pagination.pages,
    );
    TestValidator.predicate(
      "last page data count reasonable",
      lastPage.data.length <= 10,
    );
  }
  // 4. Test page number exceeding total pages returns empty results
  const largePageNumber = totalRecords.pagination.pages + 100;
  const emptyPage =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          page: largePageNumber,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "out-of-bounds page returns empty data",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "out-of-bounds page current",
    emptyPage.pagination.current,
    largePageNumber,
  );
  // 5. Test default pagination values when parameters omitted
  const defaultPagination =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default page is 1",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit reasonable",
    defaultPagination.pagination.limit > 0,
  );
  // 6. Test large page numbers handling
  const veryLargePage =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          page: 1000000,
          limit: 5,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(veryLargePage);
  TestValidator.equals(
    "very large page returns empty",
    veryLargePage.data.length,
    0,
  );
  // 7. Test limit parameter upper boundary (maximum 100)
  const maxLimitPage =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "maximum limit 100 works",
    maxLimitPage.pagination.limit,
    100,
  );
}
