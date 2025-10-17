import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";

export async function test_api_report_post_success(
  connection: api.IConnection,
) {
  // 1. Authenticate member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphaNumeric(8);
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const authResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(authResponse);

  // 2. Create a community to contain the post
  const communityName: string = RandomGenerator.alphaNumeric(6);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post to be reported
  const postTitle: string = RandomGenerator.paragraph({ sentences: 1 });
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

  // 4. Submit a report on the post with valid reason category "inappropriate"
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reportedContentId: post.id,
        reportReason: "inappropriate",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 5. Validate report has correct properties
  TestValidator.equals(
    "report target is the correct post",
    report.reported_content_id,
    post.id,
  );
  TestValidator.equals(
    "reporter is the authenticating member",
    report.reporter_id,
    authResponse.id,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report reason is inappropriate",
    report.report_reason,
    "inappropriate",
  );
  TestValidator.predicate(
    "report has a valid timestamp",
    report.created_at !== undefined,
  );
  TestValidator.predicate(
    "report has a valid update timestamp",
    report.updated_at !== undefined,
  );
  TestValidator.equals(
    "report target_type is post",
    report.target_type,
    "post",
  );
}
