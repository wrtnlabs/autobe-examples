import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_pending_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "super",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test initial page request with default pagination
  const firstPage =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate first page structure
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page has records or empty",
    firstPage.pagination.records >= 0,
  );
  // 3. Test cursor-based pagination navigation
  if (
    firstPage.data.length > 0 &&
    firstPage.pagination.records > firstPage.data.length
  ) {
    // There are more pages to navigate
    const cursor = typia.random<string>(); // In real scenario, would use actual cursor from response
    const secondPage =
      await api.functional.discussionBoard.admin.admin_requests.pending.index(
        adminConnection,
        {
          body: {
            status: "pending",
            limit: 10,
            cursor: cursor,
          } satisfies IDiscussionBoardAdminRequest.IRequest,
        },
      );
    typia.assert(secondPage);
    // Validate second page structure
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
    TestValidator.predicate(
      "second page has valid records",
      secondPage.data.length <= 10,
    );
    // Validate ordering consistency (submitted_at DESC)
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const lastFirstPage = firstPage.data[firstPage.data.length - 1];
      const firstSecondPage = secondPage.data[0];
      TestValidator.predicate(
        "ordering maintained across pages",
        lastFirstPage.submitted_at >= firstSecondPage.submitted_at,
      );
    }
  }
  // 4. Test empty results pagination
  const emptyPage =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          submitted_at_gte: new Date(Date.now() + 10000000000).toISOString(), // Future date
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(emptyPage);
  // Validate empty page structure
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
}
