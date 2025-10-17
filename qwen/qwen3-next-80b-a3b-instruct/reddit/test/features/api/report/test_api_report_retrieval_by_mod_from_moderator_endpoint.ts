import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";

export async function test_api_report_retrieval_by_mod_from_moderator_endpoint(
  connection: api.IConnection,
) {
  // 1. Create a member account to submit a report
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphaNumeric(8);
  const memberPassword: string = typia.random<
    string & tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
  >();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Authenticate member to create a post
  // Note: The member JWT is already set in connection after join
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
    RandomGenerator.pick(["spam", "harassment", "inappropriate", "other"]) as
      | "spam"
      | "harassment"
      | "inappropriate"
      | "other";
  const reportNotes: string | undefined =
    RandomGenerator.paragraph({ sentences: 2 }) || undefined;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reportedContentId: post.id,
        reportReason,
        reportNotes,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 4. Create a moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphaNumeric(8);
  const moderatorPassword: string = typia.random<
    string & tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
  >();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 5. Use moderator connection to retrieve the report
  const retrievedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // 6. Validate that the retrieved report matches the original report
  // All properties from response are snake_case in ICommunityPlatformReport
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reported content ID matches",
    retrievedReport.reported_content_id,
    report.reported_content_id,
  );
  TestValidator.equals(
    "reporter ID matches",
    retrievedReport.reporter_id,
    report.reporter_id,
  );
  TestValidator.equals(
    "target type matches",
    retrievedReport.target_type,
    report.target_type,
  );
  TestValidator.equals(
    "report reason matches",
    retrievedReport.report_reason,
    report.report_reason,
  );
  TestValidator.equals(
    "report notes match",
    retrievedReport.report_notes,
    report.report_notes,
  );
  TestValidator.equals("status matches", retrievedReport.status, report.status);
  TestValidator.equals(
    "created_at matches",
    retrievedReport.created_at,
    report.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedReport.updated_at,
    report.updated_at,
  );
}
