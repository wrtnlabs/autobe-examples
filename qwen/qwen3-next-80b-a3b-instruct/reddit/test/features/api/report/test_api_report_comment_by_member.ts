import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_comment_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphabets(8), // Valid format: alphanumeric (a-z, A-Z, 0-9) + underscore only
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Create a post to host the comment (using a valid community_id)
  // Since no community creation endpoint exists, use a random UUID as community_id
  // Assuming a valid community exists in the system
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberAuth.token;
  const post = await generate_random_reddit_community_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        community_id: typia.random<string & tags.Format<"uuid">>(), // Use random UUID assuming valid community exists
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 5,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post (by the same member)
  const commentConnection: api.IConnection = { host: connection.host };
  commentConnection.headers = memberAuth.token;
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      commentConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Submit a report on the comment
  const reportConnection: api.IConnection = { host: connection.host };
  reportConnection.headers = memberAuth.token;
  const report = await generate_random_reddit_community_member_reports_create(
    reportConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 10,
          wordMax: 30,
        }),
        commentId: comment.id,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // 5. Validate report structure and content
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report reporter matches",
    report.reporter.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "report target comment matches",
    report.target.id,
    comment.id,
  );
  // Confirm the target of the report is a comment summary (not post)
  TestValidator.equals(
    "report target has comment-specific fields",
    "content" in report.target,
    true,
  );
  // Safely access comment-specific properties using type guards
  const target = report.target;
  if ("content" in target && "created_at" in target && "vote_score" in target) {
    TestValidator.equals(
      "report target has correct author",
      target.author.id,
      comment.author.id,
    );
    TestValidator.equals(
      "report target content matches",
      target.content,
      comment.content,
    );
    TestValidator.equals(
      "report target created_at is same",
      target.created_at,
      comment.created_at,
    );
    TestValidator.equals(
      "report target vote_score matches",
      target.vote_score,
      comment.vote_score,
    );
  }
  // Confirm reporter summary has required fields
  TestValidator.equals(
    "reporter has username",
    report.reporter.username.length > 0,
    true,
  );
  TestValidator.equals(
    "reporter has display_name",
    report.reporter.display_name.length > 0,
    true,
  );
  TestValidator.predicate("reporter karma is valid", () => {
    return (
      typeof report.reporter.karma_score === "number" &&
      report.reporter.karma_score >= 0
    );
  });
  // Ensure reporter is not the author of the comment (business rules)
  TestValidator.notEquals(
    "reporter is not comment author",
    report.reporter.id,
    report.target.author.id,
  );
  // 6. Test that reporting own comment is forbidden
  const reportOwnConnection: api.IConnection = { host: connection.host };
  reportOwnConnection.headers = memberAuth.token;
  await TestValidator.error("report own comment returns 400", async () => {
    await api.functional.redditCommunity.member.reports.create(
      reportOwnConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 20,
          }),
          commentId: comment.id, // This is the user's own comment
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  });
}
