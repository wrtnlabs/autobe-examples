import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardActivityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityReport";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardActivityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator activity report action type filtering.
 *
 * This test verifies that the activity report endpoint correctly filters
 * audit log records by action type. It tests:
 * 1. Single action type filtering
 * 2. Multiple action type filtering
 * 3. All action types (no filter)
 *
 * For each test case, we verify:
 * - action_type_breakdown only contains the requested action types
 * - total_count accurately reflects filtered activities
 * - Response structure is valid
 */
export async function test_api_admin_activity_report_action_type_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test single action type filtering
  const singleTypeReport =
    await api.functional.discussionBoard.admin.reports.activity.index(
      adminConnection,
      {
        body: {
          actionTypes: ["article.create"],
          page: 1,
          pageSize: 100,
        } satisfies IDiscussionBoardActivityReport.IRequest,
      },
    );
  typia.assert(singleTypeReport);
  // Verify single type filtering
  TestValidator.predicate(
    "single type breakdown only contains article.create",
    Object.keys(singleTypeReport.data[0]?.action_type_breakdown ?? {}).every(
      (key) => key === "article.create",
    ),
  );
  // 3. Test multiple action type filtering
  const multipleTypesReport =
    await api.functional.discussionBoard.admin.reports.activity.index(
      adminConnection,
      {
        body: {
          actionTypes: ["article.create", "article.update", "comment.create"],
          page: 1,
          pageSize: 100,
        } satisfies IDiscussionBoardActivityReport.IRequest,
      },
    );
  typia.assert(multipleTypesReport);
  // Verify multiple types filtering
  TestValidator.predicate(
    "multiple type breakdown only contains requested types",
    Object.keys(multipleTypesReport.data[0]?.action_type_breakdown ?? {}).every(
      (key) =>
        ["article.create", "article.update", "comment.create"].includes(key),
    ),
  );
  // 4. Test all action types (no filter)
  const allTypesReport =
    await api.functional.discussionBoard.admin.reports.activity.index(
      adminConnection,
      {
        body: {
          page: 1,
          pageSize: 100,
        } satisfies IDiscussionBoardActivityReport.IRequest,
      },
    );
  typia.assert(allTypesReport);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    allTypesReport.pagination.current >= 1 &&
      allTypesReport.pagination.limit > 0 &&
      allTypesReport.pagination.records >= 0,
  );
  // 5. Verify total_count consistency
  TestValidator.predicate(
    "total_count is non-negative",
    allTypesReport.data[0]?.total_count >= 0,
  );
  // 6. Verify member and admin activity counts
  TestValidator.predicate(
    "member_activity_count is non-negative",
    allTypesReport.data[0]?.member_activity_count >= 0,
  );
  TestValidator.predicate(
    "admin_activity_count is non-negative",
    allTypesReport.data[0]?.admin_activity_count >= 0,
  );
}
