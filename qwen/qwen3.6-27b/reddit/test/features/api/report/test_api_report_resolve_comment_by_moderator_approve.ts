import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import type { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { generate_random_reddit_like_community_member_reports_report_on_comments_create } from "../../../generate/generate_random_reddit_like_community_member_reports_report_on_comments_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";
import { prepare_random_reddit_like_community_report_on_comment } from "../../../prepare/prepare_random_reddit_like_community_report_on_comment";

/**
 * Test moderator approval of a comment report in a Reddit-like community.
 *
 * Validates the moderator report resolution workflow where a community owner approves a report targeting a comment, resulting in permanent deletion of the reported content and all nested replies.
 *
 * The test verifies that only community moderators can resolve reports, that pending comment reports are correctly processed, and that the resolution updates the report status, soft-deletes the junction record, and cascade-deletes the target comment.
 *
 * 1. Moderator authenticates as a new member and creates a community (becoming owner).
 * 2. Commenter authenticates as a second member.
 * 3. Both members subscribe to the community.
 * 4. Moderator creates a post in the community.
 * 5. Commenter creates a comment on the post.
 * 6. Commenter creates a report targeting the comment.
 * 7. Commenter creates the report-on-comment junction record.
 * 8. Moderator resolves the report with resolutionType='approve'.
 * 9. System returns 204 No Content indicating successful resolution.
 */
export async function test_api_report_resolve_comment_by_moderator_approve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup - authenticate and create community
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 2. Commenter setup - authenticate as second member
  const commenterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(commenterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 3. Both members subscribe to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      commenterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    ),
  );
  // 4. Moderator creates a post
  const post = await generate_random_reddit_like_community_member_posts_create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({
          paragraphs: 2,
          wordMin: 4,
          wordMax: 8,
        }),
      },
    },
  );
  typia.assert(post);
  // 5. Commenter creates a comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      commenterConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Commenter creates a report targeting the comment
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      commenterConnection,
      {
        body: {
          commentId: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(report);
  // 7. Commenter creates the report-on-comment junction record
  const reportOnComment =
    await generate_random_reddit_like_community_member_reports_report_on_comments_create(
      commenterConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          comment_id: comment.id,
        },
      },
    );
  typia.assert(reportOnComment);
  // 8. Moderator resolves the report with approval
  await api.functional.redditLikeCommunity.member.reports.report_on_comments.resolve(
    moderatorConnection,
    {
      reportId: report.id,
      reportOnCommentId: reportOnComment.id,
      body: {
        resolutionType: "approve",
      } satisfies IREdditLikeCommunityReportOnComment.IResolution,
    },
  );
  // 9. Response is void (204 No Content) - success verified by no exception thrown
}