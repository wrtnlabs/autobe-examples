import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_reports_moderator_view_pending_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member and authenticate using the join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string &
        tags.Format<"email">,
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >() satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string &
        tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string &
        tags.Format<"ipv4">,
    },
  });
  typia.assert(member);
  // Verify member has moderator privileges (check moderatorOfCommunities)
  typia.assert(member.moderatorOfCommunities);
  TestValidator.predicate(
    "member has moderator privileges",
    member.moderatorOfCommunities.length > 0,
  );
  // 2. Use memberConnection directly for the reports endpoint (headers already set)
  // 3. Call the reports endpoint to view pending reports
  const reports = await api.functional.redditPlatform.member.reports.index(
    memberConnection,
    {
      body: {
        status: "PENDING" satisfies "PENDING" | "RESOLVED" | "DISMISSED",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(reports);
  // 4. Validate response structure and pagination
  typia.assert(reports.pagination);
  typia.assert(reports.data);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    reports.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    reports.pagination.limit >= 1 && reports.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    reports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    reports.pagination.pages ===
      (reports.pagination.records > 0
        ? Math.ceil(reports.pagination.records / reports.pagination.limit)
        : 0),
  );
  // 5. Validate report data structure if any reports exist
  if (reports.data.length > 0) {
    typia.assert(reports.data[0]);
    const firstReport = reports.data[0];
    // Validate individual report fields
    typia.assert(firstReport.id);
    TestValidator.predicate(
      "report has valid id",
      /^[0-9a-f-]{36}$/i.test(firstReport.id),
    );
    typia.assert(firstReport.reporter_username);
    typia.assert(firstReport.community_name);
    typia.assert(firstReport.reported_content_type);
    typia.assert(firstReport.reported_content_id);
    typia.assert(firstReport.reason);
    typia.assert(firstReport.status);
    typia.assert(firstReport.created_at);
    // Validate report content type is POST or COMMENT
    TestValidator.predicate(
      "content type is POST or COMMENT",
      firstReport.reported_content_type === "POST" ||
        firstReport.reported_content_type === "COMMENT",
    );
    // Validate report status is PENDING, RESOLVED, or DISMISSED
    TestValidator.predicate(
      "report status is valid",
      firstReport.status === "PENDING" ||
        firstReport.status === "RESOLVED" ||
        firstReport.status === "DISMISSED",
    );
    // Validate report reason length (minimum 10, maximum 500)
    TestValidator.predicate(
      "report reason has minimum length of 10",
      firstReport.reason.length >= 10,
    );
    TestValidator.predicate(
      "report reason has maximum length of 500",
      firstReport.reason.length <= 500,
    );
    // If resolved_at is present, validate it's a valid date-time
    if (firstReport.resolved_at !== undefined) {
      typia.assert(firstReport.resolved_at);
    }
  }
  // 6. Test that reports can be filtered by status
  const resolvedReports =
    await api.functional.redditPlatform.member.reports.index(memberConnection, {
      body: {
        status: "RESOLVED" satisfies "PENDING" | "RESOLVED" | "DISMISSED",
        page: 1,
        limit: 20,
      },
    });
  typia.assert(resolvedReports);
  typia.assert(resolvedReports.pagination);
  typia.assert(resolvedReports.data);
  // 7. Test that reports can be filtered by content type
  const postReports = await api.functional.redditPlatform.member.reports.index(
    memberConnection,
    {
      body: {
        content_type: "POST" satisfies "POST" | "COMMENT",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(postReports);
  typia.assert(postReports.pagination);
  typia.assert(postReports.data);
  // 8. Verify reports are sorted by created_at DESC (newest first) when multiple pages
  if (reports.data.length >= 2) {
    const firstCreatedAt = new Date(reports.data[0].created_at).getTime();
    const secondCreatedAt = new Date(reports.data[1].created_at).getTime();
    TestValidator.predicate(
      "reports are sorted by created_at DESC",
      firstCreatedAt >= secondCreatedAt,
    );
  }
}
