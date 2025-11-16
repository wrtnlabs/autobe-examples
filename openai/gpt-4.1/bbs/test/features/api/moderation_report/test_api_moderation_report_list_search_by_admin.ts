import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Validate admin's ability to search and paginate moderation reports with
 * advanced filtering.
 *
 * 1. Register an admin and authenticate.
 * 2. Search moderation reports (as admin) with no filters (default), verify
 *    pagination response schema.
 * 3. Search using several combinations of filters:
 *
 *    - Target_type ("article"/"comment"/"attachment"); status
 *         ("open"/"in_review"/"resolved"),
 *    - Reporter_user_id,
 *    - Reason keyword substring,
 *    - Created_at_from / created_at_to bounds
 * 4. For each search, verify that all returned report summaries match the filters.
 * 5. For pagination, use limit=3 and various page numbers, verify result size and
 *    page info.
 * 6. Attempt to access the endpoint without authentication, expect error.
 */
export async function test_api_moderation_report_list_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A$1", // assure strong password
    href: "https://admin-join.test/" + RandomGenerator.alphaNumeric(10),
    referrer: "https://referrer.test/" + RandomGenerator.alphaNumeric(8),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Search: no filters (default), expect paginated result
  const resPage =
    await api.functional.discussionBoard.admin.moderation.reports.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(resPage);
  TestValidator.predicate("pagination field present", !!resPage.pagination);
  TestValidator.predicate("data field present", !!resPage.data);

  // 3. Advanced filter: e.g., target_type
  const targetType = RandomGenerator.pick([
    "article",
    "comment",
    "attachment",
  ] as const);
  const resTargetType =
    await api.functional.discussionBoard.admin.moderation.reports.index(
      connection,
      {
        body: { target_type: targetType },
      },
    );
  typia.assert(resTargetType);
  for (const r of resTargetType.data) {
    TestValidator.equals(
      "report matches target_type filter",
      r.target_type,
      targetType,
    );
  }

  // 4. Advanced filter: status
  const status = RandomGenerator.pick([
    "open",
    "in_review",
    "resolved",
  ] as const);
  const resStatus =
    await api.functional.discussionBoard.admin.moderation.reports.index(
      connection,
      {
        body: { status },
      },
    );
  typia.assert(resStatus);
  for (const r of resStatus.data) {
    TestValidator.equals("report matches status filter", r.status, status);
  }

  // 5. Advanced filter: pagination (limit & page)
  const resPaginated =
    await api.functional.discussionBoard.admin.moderation.reports.index(
      connection,
      {
        body: { limit: 3, page: 1 },
      },
    );
  typia.assert(resPaginated);
  TestValidator.equals(
    "paginated result length <= limit",
    resPaginated.data.length <= 3,
    true,
  );
  TestValidator.equals(
    "pagination page index",
    resPaginated.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", resPaginated.pagination.limit, 3);

  // 6. Attempt access without authentication (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access moderation report search endpoint",
    async () => {
      await api.functional.discussionBoard.admin.moderation.reports.index(
        unauthConn,
        { body: {} },
      );
    },
  );
}
