import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

export async function test_api_content_report_retrieval_with_comment_target(
  connection: api.IConnection,
) {
  // 1. Create community moderator for report access
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "Moderator123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com/login",
        ip: "192.168.1.100",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // 2. Create member who will submit the report
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      email: reporterEmail,
      password: "Reporter123!",
      nickname: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(reporter);

  // 3. Create member who will write the comment being reported
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      email: authorEmail,
      password: "Author123!",
      nickname: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(author);

  // 4. Create post to host the comment that will be reported
  // Switch to author account to create post
  await api.functional.auth.member.login(connection, {
    body: {
      email: authorEmail,
      password: "Author123!",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com",
      ip: "192.168.1.101",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(2),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        reddit_community_id: "00000000-0000-0000-0000-000000000000",
        reddit_post_type_id: "00000000-0000-0000-0000-000000000000",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Create comment that will be the target of the report
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
          reddit_post_id: post.id,
          href: `https://reddit-community.com/posts/${post.id}`,
          referrer: `https://reddit-community.com/posts/${post.id}`,
          ip: "192.168.1.101",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // 6. Submit report targeting the comment
  // Switch to reporter account
  await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: "Reporter123!",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com",
      ip: "192.168.1.102",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  const report =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: "Comment contains harassment and personal attacks",
          report_category: "harassment",
          content_type: "comment",
          comment_id: comment.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(report);

  // 7. Retrieve the detailed content report as community moderator
  // Switch back to moderator account
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "Moderator123!",
      href: "https://reddit-community.com/moderator/login",
      referrer: "https://reddit-community.com",
      ip: "192.168.1.100",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const detailedReport =
    await api.functional.redditCommunity.communityModerator.contentReports.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(detailedReport);

  // 8. Validate comment-specific report details
  TestValidator.equals(
    "report maintains permalink/reference",
    detailedReport.id,
    report.id,
  );
  TestValidator.equals(
    "report status should be submitted initially",
    detailedReport.status,
    "submitted",
  );
  TestValidator.equals(
    "report category matches submission",
    detailedReport.report_category,
    "harassment",
  );
  TestValidator.equals(
    "report reason matches submission",
    detailedReport.report_reason,
    "Comment contains harassment and personal attacks",
  );

  // 9. Validate comment target context
  TestValidator.predicate(
    "reported_comment should exist",
    detailedReport.reported_comment !== null &&
      detailedReport.reported_comment !== undefined,
  );
  if (detailedReport.reported_comment) {
    TestValidator.equals(
      "comment ID matches target",
      detailedReport.reported_comment.id,
      comment.id,
    );
    TestValidator.equals(
      "comment content preserved",
      detailedReport.reported_comment.content,
      comment.content,
    );
    TestValidator.equals(
      "comment thread depth matches",
      detailedReport.reported_comment.thread_depth,
      comment.thread_depth,
    );
    TestValidator.equals(
      "comment total votes match",
      detailedReport.reported_comment.upvote_count +
        detailedReport.reported_comment.downvote_count,
      comment.upvote_count + comment.downvote_count,
    );
  }

  // 10. Validate member relationships
  TestValidator.equals(
    "reporter ID matches",
    detailedReport.reporter.id,
    reporter.id,
  );
  TestValidator.equals(
    "reported member ID matches author",
    detailedReport.reported_member.id,
    author.id,
  );
  TestValidator.notEquals(
    "reporter should not be reported member",
    detailedReport.reporter.id,
    detailedReport.reported_member.id,
  );

  // 11. Validate timestamps and workflow
  TestValidator.predicate(
    "report has creation timestamp",
    detailedReport.reported_at !== null,
  );
  TestValidator.predicate(
    "initial report has no resolution timestamp",
    detailedReport.resolved_at === null ||
      detailedReport.resolved_at === undefined,
  );

  // 12. Ensure no post is incorrectly referenced since this is a comment report
  TestValidator.predicate(
    "post should not be referenced in comment report",
    detailedReport.reported_post === null ||
      detailedReport.reported_post === undefined,
  );
}
