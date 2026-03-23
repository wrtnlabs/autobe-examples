import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a community moderator can view a report about a comment (not a post).
 * This test verifies the complete workflow of creating a comment report and
 * retrieving it as a community moderator, ensuring the response structure
 * correctly represents comment content instead of post content.
 */
export async function test_api_report_view_comment_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Create a community (moderator becomes owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create and authenticate reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(reporterAuth);
  // 4. Add reporter as moderator to community (to allow them to create posts)
  await generate_random_reddit_clone_member_communities_moderators_create(
    moderatorConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        memberId: reporterAuth.id,
        role: "mod",
      },
    },
  );
  // 5. Create a post in the community as the reporter
  const post = await generate_random_reddit_clone_member_posts_create(
    reporterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 6. Create a comment on the post as the reporter
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      reporterConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 7. Submit a report on the comment as the reporter
  const report = await generate_random_reddit_clone_member_reports_create(
    reporterConnection,
    {
      body: {
        content_type: "comment",
        reason: "This comment violates community guidelines",
        comment_id: comment.id,
      },
    },
  );
  typia.assert(report);
  // 8. Authenticate as moderator member (already authenticated)
  // moderatorConnection is already authenticated from step 1
  // 9. Call GET /redditClone/member/reports/{reportId} as moderator
  const retrievedReport = await api.functional.redditClone.member.reports.at(
    moderatorConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 10. Validate the response contains correct comment report data
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "content type is comment",
    retrievedReport.content_type,
    "comment",
  );
  TestValidator.equals(
    "reportedPost is null",
    retrievedReport.reportedPost,
    null,
  );
  TestValidator.predicate(
    "reportedComment exists",
    retrievedReport.reportedComment !== null,
  );
  TestValidator.equals(
    "reportedComment ID matches",
    retrievedReport.reportedComment!.id,
    comment.id,
  );
  TestValidator.equals(
    "reportedComment content matches",
    retrievedReport.reportedComment!.content,
    comment.content,
  );
  TestValidator.equals(
    "reportedComment author is reporter",
    retrievedReport.reportedComment!.author.id,
    reporterAuth.id,
  );
  TestValidator.equals(
    "reportedComment post ID matches",
    retrievedReport.reportedComment!.post.id,
    post.id,
  );
  TestValidator.equals(
    "reporter ID matches",
    retrievedReport.reporter.id,
    reporterAuth.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "reason is present",
    retrievedReport.reason.length > 0,
    true,
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
}