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

export async function test_api_admin_activity_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve activity report with default pagination
  const report =
    await api.functional.discussionBoard.admin.reports.activity.index(
      adminConnection,
      {
        body: {
          page: 1,
          pageSize: 10,
        } satisfies IDiscussionBoardActivityReport.IRequest,
      },
    );
  typia.assert(report);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", report.pagination.current, 1);
  TestValidator.equals("has limit", report.pagination.limit, 10);
  TestValidator.predicate("has total records", report.pagination.records >= 0);
  TestValidator.predicate("has total pages", report.pagination.pages >= 0);
  // 4. Validate report data structure
  TestValidator.predicate("has data array", Array.isArray(report.data));
  // 5. If there are reports, validate business logic relationships
  if (report.data.length > 0) {
    const firstReport = report.data[0];
    typia.assert(firstReport);
    // Validate business logic: total_count should equal member + admin activity
    TestValidator.equals(
      "total count matches breakdown",
      firstReport.total_count,
      firstReport.member_activity_count + firstReport.admin_activity_count,
    );
  }
}
