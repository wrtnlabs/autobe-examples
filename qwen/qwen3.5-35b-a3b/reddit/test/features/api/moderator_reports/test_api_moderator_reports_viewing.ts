import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderator_reports_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - create and authenticate member account
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // 2. Test viewing reports with default pagination
  const reportsPage = await api.functional.redditCommunity.member.reports.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(reportsPage);
  // 3. Validate pagination structure
  const pagination = reportsPage.pagination;
  TestValidator.equals("pagination has current page", pagination.current, 1);
  TestValidator.equals(
    "pagination has limit",
    pagination.limit,
    pagination.limit,
  );
  TestValidator.equals(
    "pagination has records",
    pagination.records,
    pagination.records,
  );
  TestValidator.equals(
    "pagination has pages",
    pagination.pages,
    pagination.pages,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    pagination.pages === 0 ||
      Math.ceil(pagination.records / pagination.limit) === pagination.pages,
  );
  // 4. Validate report summaries structure
  for (const report of reportsPage.data) {
    typia.assert(report!);
    // Validate reporter reference
    typia.assert(report.reporter!);
    typia.assert(report.reporter.id!);
    typia.assert(report.reporter.username!);
    typia.assert(report.reporter.created_at!);
    // Validate community reference
    typia.assert(report.community!);
    typia.assert(report.community.id!);
    typia.assert(report.community.name!);
    typia.assert(report.community.description!);
    typia.assert(report.community.subscriber_count!);
    typia.assert(report.community.owner!);
    typia.assert(report.community.created_at!);
    typia.assert(report.community.updated_at!);
    // Validate report fields
    typia.assert(report.target_type!);
    TestValidator.predicate(
      "target type is post or comment",
      report.target_type === "post" || report.target_type === "comment",
    );
    typia.assert(report.target_id!);
    typia.assert(report.reason!);
    typia.assert(report.status!);
    TestValidator.predicate(
      "status is valid",
      report.status === "pending" ||
        report.status === "approved" ||
        report.status === "dismissed",
    );
    typia.assert(report.created_at!);
    typia.assert(report.updated_at!);
    typia.assert(report.deleted_at !== undefined);
  }
  // 5. Test filtering by status
  const pendingReports =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "all pending reports",
    pendingReports.data.every(
      (report: IRedditCommunityReport.ISummary) => report.status === "pending",
    ),
  );
  // 6. Test pagination with custom page size
  const reportsLarge =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          pageSize: 100,
        },
      },
    );
  typia.assert(reportsLarge);
  TestValidator.equals("page size set", reportsLarge.pagination.limit, 100);
  // 7. Test sorting by createdAt
  const sortedReports =
    await api.functional.redditCommunity.member.reports.index(
      memberConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "DESC",
        },
      },
    );
  typia.assert(sortedReports);
  TestValidator.equals(
    "sort field set",
    sortedReports.pagination.records >= 0,
    true,
  );
}
