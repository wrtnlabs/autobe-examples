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

export async function test_api_content_report_detail_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator joins the system
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinBody = {
    email: moderatorEmail,
    password: "1234",
    href: "https://example.com/moderator/join",
    referrer: "https://example.com",
  } satisfies IRedditCommunityModerator.IJoin;
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 2. Admin joins the system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  // Creating user for admin actor
  const adminUserJoinBody = {
    email: adminEmail,
    password: "1234",
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
  } satisfies IRedditCommunityUser.ICreate;

  // Because API for admin join requires IRedditCommunityAdmin.ICreate, which requires user_id (existing user), so first create user
  // Use auth.user.join to create user
  const adminUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: adminUserJoinBody,
    });
  typia.assert(adminUser);

  // Now create admin linked to user
  const adminCreateBody = {
    user_id: adminUser.id,
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 3. Admin creates a content report reason
  const now = new Date().toISOString();
  const reportReasonCreateBody = {
    reason_code: "spam",
    reason_name: "Spam Content",
    description: "Content that is unsolicited advertisement or spam.",
    created_at: now,
    updated_at: now,
  } satisfies IRedditCommunityReportReason.ICreate;
  // Switch authentication to admin user
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  const reportReason: IRedditCommunityReportReason =
    await api.functional.redditCommunity.admin.redditCommunityReportReasons.create(
      connection,
      { body: reportReasonCreateBody },
    );
  typia.assert(reportReason);

  // 4. User joins the system
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinBody = {
    email: userEmail,
    password: "1234",
    href: "https://example.com/user/join",
    referrer: "https://example.com",
  } satisfies IRedditCommunityUser.ICreate;
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(user);

  // 5. User creates a new content report
  // For content_id, use a random UUID, simulate report on a post
  const contentId = typia.random<string & tags.Format<"uuid">>();
  const contentReportCreateBody = {
    content_id: contentId,
    report_reason_id: reportReason.id,
    content_type: "post",
    additional_details: "Reported due to spam advertising.",
  } satisfies IRedditCommunityContentReport.ICreate;
  // Switch authentication to user
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: "1234",
      href: "https://example.com/user/login",
      referrer: "https://example.com",
    } satisfies IRedditCommunityUser.ILogin,
  });
  const contentReport: IRedditCommunityContentReport =
    await api.functional.redditCommunity.user.content_reports.create(
      connection,
      { body: contentReportCreateBody },
    );
  typia.assert(contentReport);

  // 6. Moderator logs in again to ensure correct auth context
  await api.functional.auth.moderator.login(connection, {
    body: moderatorJoinBody as IRedditCommunityModerator.ILogin,
  });

  // 7. Moderator retrieves the content report detail by contentReportId
  const reportDetail: IRedditCommunityContentReport =
    await api.functional.redditCommunity.moderator.content_reports.at(
      connection,
      { contentReportId: contentReport.id },
    );
  typia.assert(reportDetail);

  // 8. Validate the retrieved report detail
  TestValidator.equals(
    "reporter id should match user",
    reportDetail.reporter_id,
    user.id,
  );
  TestValidator.equals(
    "report reason id should match created reason",
    reportDetail.report_reason_id,
    reportReason.id,
  );
  TestValidator.equals(
    "content id should match",
    reportDetail.content_id,
    contentId,
  );
  TestValidator.equals(
    "content type should be 'post'",
    reportDetail.content_type,
    "post",
  );
  TestValidator.equals(
    "additional details should match",
    reportDetail.additional_details,
    "Reported due to spam advertising.",
  );
}
