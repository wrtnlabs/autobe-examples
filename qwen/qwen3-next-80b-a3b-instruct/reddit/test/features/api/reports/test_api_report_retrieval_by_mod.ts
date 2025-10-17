import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";

export async function test_api_report_retrieval_by_mod(
  connection: api.IConnection,
) {
  // 1. Create member account to submit report
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphaNumeric(10);
  const memberPassword: string = "ValidPass123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create post to report
  const postTitle: string = RandomGenerator.paragraph({ sentences: 3 });
  const postContent: string = RandomGenerator.content({ paragraphs: 2 });

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: postTitle,
        content: postContent,
        post_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 3. Submit a report on the created post
  const reportReason: "spam" | "harassment" | "inappropriate" | "other" =
    "harassment";
  const reportNotes: string = "This post contains abusive language";

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reportedContentId: post.id,
        reportReason,
        reportNotes,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 4. Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphaNumeric(10);
  const moderatorPassword: string = "ModeratorPass789!";

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 5. Authenticate as moderator to retrieve report
  // The connection now automatically uses moderator's authentication token

  // 6. Retrieve report by reportId
  const retrievedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // 7. Validate report details are complete and accessible to moderator
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter ID matches",
    retrievedReport.reporter_id,
    member.id,
  );
  TestValidator.equals(
    "target type is post",
    retrievedReport.target_type,
    "post",
  );
  TestValidator.equals(
    "reported content ID matches",
    retrievedReport.reported_content_id,
    post.id,
  );
  TestValidator.equals(
    "reported comment ID is null",
    retrievedReport.reported_comment_id,
    null,
  );
  TestValidator.equals(
    "report reason matches",
    retrievedReport.report_reason,
    reportReason,
  );
  TestValidator.equals(
    "report notes match",
    retrievedReport.report_notes,
    reportNotes,
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );

  // Confirm moderator can access report submitted by member
  TestValidator.notEquals(
    "moderator can access report from member",
    retrievedReport.id,
    "",
  );
}
