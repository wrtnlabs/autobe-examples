import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_content_report_update_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator join
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinInput = {
    email: moderatorEmail,
    password: "StrongPass!23",
    ip: null,
    href: "https://example.com/profile",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityModerator.IJoin;
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinInput,
    });
  typia.assert(moderator);

  // 2. User join for admin creation
  const userForAdminEmail = typia.random<string & tags.Format<"email">>();
  const userForAdminJoinInput = {
    email: userForAdminEmail,
    password: "StrongPass!23",
    ip: null,
    href: "https://example.com/profile",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityUser.ICreate;
  const userForAdmin: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userForAdminJoinInput,
    });
  typia.assert(userForAdmin);

  // 3. Admin join with user_id
  const adminJoinInput = {
    user_id: userForAdmin.id,
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 4. Admin login
  const adminLoginInput = {
    email: userForAdminEmail,
    password: "StrongPass!23",
    ip: null,
    href: "https://example.com/admin",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginInput });

  // 5. Create report reason
  const now = new Date();
  const reportReasonInput = {
    reason_code: "spam",
    reason_name: "Spam or advertisement",
    description: "Content that is advertising or spam.",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  } satisfies IRedditCommunityReportReason.ICreate;
  const reportReason: IRedditCommunityReportReason =
    await api.functional.redditCommunity.admin.redditCommunityReportReasons.create(
      connection,
      {
        body: reportReasonInput,
      },
    );
  typia.assert(reportReason);

  // 6. User join for content reporting
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinInput = {
    email: userEmail,
    password: "StrongPass!23",
    ip: null,
    href: "https://example.com/user",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityUser.ICreate;
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinInput,
    });
  typia.assert(user);

  // 7. User login
  const userLoginInput = {
    email: userEmail,
    password: "StrongPass!23",
    ip: null,
    href: "https://example.com/user",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityUser.ILogin;
  await api.functional.auth.user.login(connection, { body: userLoginInput });

  // 8. Create content report
  const contentId = typia.random<string & tags.Format<"uuid">>();
  const contentReportInput = {
    content_id: contentId,
    report_reason_id: reportReason.id,
    content_type: "post",
    additional_details: "User reported spam content",
  } satisfies IRedditCommunityContentReport.ICreate;
  const contentReport: IRedditCommunityContentReport =
    await api.functional.redditCommunity.user.content_reports.create(
      connection,
      {
        body: contentReportInput,
      },
    );
  typia.assert(contentReport);

  // 9. Moderator login for session switching
  const moderatorLoginInput = {
    email: moderatorEmail,
    password: "StrongPass!23",
    ip: null,
    href: "https://example.com/profile",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityModerator.ILogin;
  await api.functional.auth.moderator.login(connection, {
    body: moderatorLoginInput,
  });

  // 10. Update content report as moderator
  const updateReasonId = reportReason.id;
  const updateStatusId = typia.random<string & tags.Format<"uuid">>();
  const contentReportUpdateInput = {
    report_reason_id: updateReasonId,
    report_status_id: updateStatusId,
    additional_details: "Reviewed and marked as valid spam",
  } satisfies IRedditCommunityContentReport.IUpdate;

  const updatedContentReport: IRedditCommunityContentReport =
    await api.functional.redditCommunity.moderator.content_reports.update(
      connection,
      {
        contentReportId: contentReport.id,
        body: contentReportUpdateInput,
      },
    );
  typia.assert(updatedContentReport);

  // 11. Validate update correctness
  TestValidator.equals(
    "Update: ID matches",
    updatedContentReport.id,
    contentReport.id,
  );
  TestValidator.equals(
    "Update: Reason ID matches",
    updatedContentReport.report_reason_id,
    updateReasonId,
  );
  TestValidator.equals(
    "Update: Status ID matches",
    updatedContentReport.report_status_id,
    updateStatusId,
  );
  TestValidator.equals(
    "Update: Additional details match",
    updatedContentReport.additional_details ?? null,
    contentReportUpdateInput.additional_details ?? null,
  );
}
