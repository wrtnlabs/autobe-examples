import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_history_retrieval_with_mixed_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Retrieve member's report history with empty body (all reports)
  const historyResponse =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {} satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    historyResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(historyResponse.data),
    true,
  );
  // 4. Validate pagination metadata
  const pagination = historyResponse.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is valid", pagination.limit >= 0);
  TestValidator.predicate("records count is valid", pagination.records >= 0);
  TestValidator.predicate("pages count is valid", pagination.pages >= 0);
  // 5. If there are reports, validate report structure
  for (const report of historyResponse.data) {
    // Validate report has required fields
    TestValidator.equals("report has id", report.id !== undefined, true);
    TestValidator.equals(
      "report has target_type",
      report.target_type !== undefined,
      true,
    );
    TestValidator.equals(
      "report has target_id",
      report.target_id !== undefined,
      true,
    );
    TestValidator.equals(
      "report has reason",
      report.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "report has status",
      report.status !== undefined,
      true,
    );
    TestValidator.equals(
      "report has created_at",
      report.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "report has community",
      report.community !== undefined,
      true,
    );
    // Validate status values
    TestValidator.predicate(
      "status is valid",
      report.status === "pending" ||
        report.status === "approved" ||
        report.status === "dismissed",
    );
    // Validate target_type values
    TestValidator.predicate(
      "target_type is valid",
      report.target_type === "post" || report.target_type === "comment",
    );
    // Validate post-specific fields
    if (report.target_type === "post") {
      TestValidator.equals(
        "post report has post_title",
        "post_title" in report,
        true,
      );
      TestValidator.equals(
        "post report has post_content",
        "post_content" in report,
        true,
      );
    }
    // Validate comment-specific fields
    if (report.target_type === "comment") {
      TestValidator.equals(
        "comment report has comment_content",
        "comment_content" in report,
        true,
      );
    }
    // Validate community structure
    TestValidator.equals(
      "community has id",
      report.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      report.community.name !== undefined,
      true,
    );
  }
  // 6. Test with status filter
  const pendingReportsResponse =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: { status: "pending" } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(pendingReportsResponse);
  // 7. Test with target_type filter
  const postReportsResponse =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: { target_type: "post" } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(postReportsResponse);
  // 8. Test pagination parameters
  const paginatedResponse =
    await api.functional.redditClone.member.reports.history.index(
      memberConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditCloneReport.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination respects limit",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination respects page",
    paginatedResponse.pagination.current,
    1,
  );
}
