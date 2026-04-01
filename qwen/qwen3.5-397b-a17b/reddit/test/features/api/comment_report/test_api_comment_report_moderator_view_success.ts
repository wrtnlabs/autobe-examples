import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_comments_reports_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test moderator viewing comment reports for their community.
 *
 * Setup:
 * 1. Create moderator member account
 * 2. Create reporter member account
 * 3. Create community for testing
 * 4. Appoint first member as community moderator
 * 5. Create post in community
 * 6. Create comment on post
 * 7. Have reporter member report the comment with a reason
 *
 * Execution:
 * - Authenticate as the moderator
 * - Call the endpoint with the community name
 *
 * Validation:
 * - Verify response contains the reported comment with correct reporter information
 * - Verify report reason, status (PENDING), reported comment content
 * - Verify pagination metadata is correct
 * - Verify report list includes all expected fields from IRedditCommunityCommentReport.ISummary
 */
export async function test_api_comment_report_moderator_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member account
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: moderatorUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create reporter member account
  const reporterUsername = RandomGenerator.name(1);
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: reporterUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(reporterAuth);
  // 3. Create community using moderator connection
  const community =
    await generate_random_reddit_community_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 4. Appoint moderator as community moderator
  const moderatorRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      moderatorConnection,
      {
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(moderatorRecord);
  // 5. Create post in community using moderator connection
  const post = await api.functional.redditCommunity.member.posts.create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 6. Create comment on post using reporter connection
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      reporterConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 7. Report the comment using reporter connection
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_reddit_community_member_comments_reports_create(
      reporterConnection,
      {
        body: {
          reason: reportReason,
        } satisfies IRedditCommunityCommentReport.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(report);
  // 8. Moderator retrieves comment reports for the community
  const reports =
    await api.functional.redditCommunity.member.communities.reports.index(
      moderatorConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(reports);
  // 9. Validate pagination metadata
  TestValidator.equals("current page", reports.pagination.current, 1);
  TestValidator.predicate("limit is positive", reports.pagination.limit > 0);
  TestValidator.equals("total records", reports.pagination.records, 1);
  TestValidator.equals("total pages", reports.pagination.pages, 1);
  // 10. Validate report data
  TestValidator.equals("has one report", reports.data.length, 1);
  const reportSummary = reports.data[0];
  // Validate report summary fields
  TestValidator.equals(
    "report reason matches",
    reportSummary.reason,
    reportReason,
  );
  TestValidator.equals(
    "report status is PENDING",
    reportSummary.status,
    "PENDING",
  );
  TestValidator.equals(
    "reporter id matches",
    reportSummary.reporter.id,
    reporterAuth.id,
  );
  TestValidator.equals(
    "reporter username matches",
    reportSummary.reporter.username,
    reporterUsername,
  );
  TestValidator.equals(
    "comment id matches",
    reportSummary.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content matches",
    reportSummary.comment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment author id matches",
    reportSummary.comment.author.id,
    reporterAuth.id,
  );
  // Validate timestamps exist and are valid
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(reportSummary.created_at)),
  );
  TestValidator.predicate(
    "created_at is in the past",
    new Date(reportSummary.created_at).getTime() <= Date.now(),
  );
}
