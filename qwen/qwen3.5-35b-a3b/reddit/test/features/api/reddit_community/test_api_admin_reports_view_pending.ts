import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditCommunityAdmin.IJoin>(),
  });
  typia.assert(admin);
  // 2. View pending reports
  const reportsResponse =
    await api.functional.redditCommunity.admin.reports.index(adminConnection, {
      body: {
        status_id: "0",
        limit: 20,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(reportsResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination current page",
    reportsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    reportsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    reportsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    reportsResponse.pagination.pages >= 0,
  );
  // 4. Validate report count
  TestValidator.equals(
    "report count matches pagination",
    reportsResponse.data.length,
    reportsResponse.pagination.records > 0
      ? reportsResponse.pagination.records
      : 0,
  );
  // 5. Validate reports sorted by created_at DESC
  if (reportsResponse.data.length > 1) {
    const firstReportCreatedAt = new Date(reportsResponse.data[0].created_at);
    const secondReportCreatedAt = new Date(reportsResponse.data[1].created_at);
    TestValidator.predicate(
      "reports sorted by created_at DESC",
      firstReportCreatedAt >= secondReportCreatedAt,
    );
  }
  // 6. Validate each report contains required fields
  for (const report of reportsResponse.data) {
    typia.assert(report);
    // Validate report has valid id
    TestValidator.predicate(
      "report has valid uuid id",
      report.id.length === 36,
    );
    // Validate reporter exists
    TestValidator.equals(
      "report has reporter",
      report.reporter !== null && report.reporter !== undefined,
      true,
    );
    TestValidator.predicate(
      "reporter has valid id",
      report.reporter.id.length === 36,
    );
    TestValidator.predicate(
      "reporter has username",
      report.reporter.username.length > 0,
    );
    // Validate community exists
    TestValidator.equals(
      "report has community",
      report.community !== null && report.community !== undefined,
      true,
    );
    TestValidator.predicate(
      "community has valid id",
      report.community.id.length === 36,
    );
    TestValidator.predicate(
      "community has name",
      report.community.name.length > 0,
    );
    // Validate reason
    TestValidator.predicate("report has reason", report.reason.length > 0);
    // Validate status_id is UUID format
    TestValidator.predicate(
      "report has status_id",
      report.status_id.length === 36,
    );
    // Validate timestamps are valid date-time format
    TestValidator.predicate(
      "report has created_at",
      report.created_at.length > 0,
    );
    TestValidator.predicate(
      "report has updated_at",
      report.updated_at.length > 0,
    );
    // Validate target content (either post or comment, not both)
    const hasPostTarget = report.targetPost !== null;
    const hasCommentTarget = report.targetComment !== null;
    TestValidator.predicate(
      "report has exactly one target (post or comment)",
      (hasPostTarget && !hasCommentTarget) ||
        (!hasPostTarget && hasCommentTarget),
    );
    // Validate target content details when present
    if (report.targetPost !== null) {
      typia.assert(report.targetPost);
      TestValidator.predicate(
        "post report has valid id",
        report.targetPost.id.length === 36,
      );
      TestValidator.predicate(
        "post report has title",
        report.targetPost.title.length > 0,
      );
      TestValidator.predicate(
        "post report has author",
        report.targetPost.author !== null,
      );
      TestValidator.predicate(
        "post report has community",
        report.targetPost.community !== null,
      );
    }
    if (report.targetComment !== null) {
      typia.assert(report.targetComment);
      TestValidator.predicate(
        "comment report has valid id",
        report.targetComment.id.length === 36,
      );
      TestValidator.predicate(
        "comment report has content",
        report.targetComment.content.length > 0,
      );
      TestValidator.predicate(
        "comment report has author",
        report.targetComment.author !== null,
      );
      TestValidator.predicate(
        "comment report has vote_count",
        report.targetComment.vote_count >= 0,
      );
    }
  }
}
