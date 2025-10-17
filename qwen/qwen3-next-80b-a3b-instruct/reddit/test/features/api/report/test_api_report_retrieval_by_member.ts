import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";

export async function test_api_report_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Create a new member account for reporting
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "ValidPass123!",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create a post to report
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        post_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 3. Submit a report on the created post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reportedContentId: post.id,
        reportReason: "inappropriate",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 4. Retrieve the report by its ID using the same member connection
  const retrievedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // 5. Validate report details
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.equals(
    "report reason matches",
    retrievedReport.report_reason,
    "inappropriate",
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
    "reporter ID matches",
    retrievedReport.reporter_id,
    member.id,
  );

  // Verify timestamps are present
  TestValidator.predicate("created_at is valid ISO date", () => {
    return !isNaN(new Date(retrievedReport.created_at).getTime());
  });
  TestValidator.predicate("updated_at is valid ISO date", () => {
    return !isNaN(new Date(retrievedReport.updated_at).getTime());
  });

  // Verify the reporter's personal information is not exposed
  TestValidator.predicate("reporter email is not in response", () => {
    return !("email" in retrievedReport);
  });
  TestValidator.predicate("reporter username is not in response", () => {
    return !("username" in retrievedReport);
  });
}
