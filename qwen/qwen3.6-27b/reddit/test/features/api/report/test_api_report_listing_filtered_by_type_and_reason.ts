import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import type { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
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
import { generate_random_reddit_like_community_member_communities_community_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_moderators_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test report listing filtered by target content type and reason text.
 *
 * Validates that a moderator can filter pending reports within a community using the
 * targetType and reason query parameters.
 *
 * 1. Owner creates a community.
 * 2. Moderator registers and owner appoints them.
 * 3. Subscriber registers and subscribes to the community.
 * 4. Subscriber creates a text post in the community.
 * 5. Subscriber creates a comment on the post.
 * 6. Subscriber reports the post with reason containing 'spam'.
 * 7. Subscriber reports the comment with reason containing 'abuse'.
 * 8. Moderator queries reports with targetType='post' filter.
 * 9. Moderator queries reports with targetType='comment' filter.
 * 10. Moderator queries reports with reason='spam' filter.
 * 11. Moderator queries reports with reporterId filter.
 */
export async function test_api_report_listing_filtered_by_type_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      username: RandomGenerator.name(),
      email: "owner@test.com",
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Moderator registers
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      username: RandomGenerator.name(),
      email: "moderator@test.com",
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 3. Owner appoints the moderator
  await api.functional.redditLikeCommunity.member.communities.community_moderators.create(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        member_id: moderatorAuth.id,
      } satisfies IRedditLikeCommunityModerator.ICreate,
    },
  );
  // 4. Subscriber registers
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriberAuth = await authorize_member_join(subscriberConnection, {
    body: {
      username: RandomGenerator.name(),
      email: "subscriber@test.com",
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 5. Subscriber subscribes to the community
  await api.functional.redditLikeCommunity.member.community_subscriptions.create(
    subscriberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
    },
  );
  // 6. Subscriber creates a text post in the community
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    subscriberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: community.id,
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Subscriber creates a comment on the post
  const comment =
    await api.functional.redditLikeCommunity.member.posts.comments.create(
      subscriberConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
      },
    );
  typia.assert(comment);
  // 8. Subscriber reports the post with reason containing 'spam'
  const postReport =
    await api.functional.redditLikeCommunity.member.reports.create(
      subscriberConnection,
      {
        body: {
          postId: post.id,
          reason: "This is spam content",
        } satisfies IREdditLikeCommunityReport.ICreate,
      },
    );
  typia.assert(postReport);
  // 9. Subscriber reports the comment with reason containing 'abuse'
  const commentReport =
    await api.functional.redditLikeCommunity.member.reports.create(
      subscriberConnection,
      {
        body: {
          commentId: comment.id,
          reason: "This is abusive language",
        } satisfies IREdditLikeCommunityReport.ICreate,
      },
    );
  typia.assert(commentReport);
  // 10. Moderator filters by targetType='post'
  const postFilteredReports =
    await api.functional.redditLikeCommunity.member.reports.community.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          targetType: "post",
        } satisfies IREdditLikeCommunityReport.IRequest,
      },
    );
  typia.assert(postFilteredReports);
  TestValidator.equals(
    "only post reports should be returned when targetType is post",
    () => postFilteredReports.data.every((r) => r.target_type === "post"),
    () => true,
  );
  TestValidator.predicate(
    "post filtered reports list is not empty",
    () => postFilteredReports.data.length > 0,
  );
  // 11. Moderator filters by targetType='comment'
  const commentFilteredReports =
    await api.functional.redditLikeCommunity.member.reports.community.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          targetType: "comment",
        } satisfies IREdditLikeCommunityReport.IRequest,
      },
    );
  typia.assert(commentFilteredReports);
  TestValidator.equals(
    "only comment reports should be returned when targetType is comment",
    () => commentFilteredReports.data.every((r) => r.target_type === "comment"),
    () => true,
  );
  TestValidator.predicate(
    "comment filtered reports list is not empty",
    () => commentFilteredReports.data.length > 0,
  );
  // 12. Moderator filters by reason='spam'
  const reasonFilteredReports =
    await api.functional.redditLikeCommunity.member.reports.community.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          reason: "spam",
        } satisfies IREdditLikeCommunityReport.IRequest,
      },
    );
  typia.assert(reasonFilteredReports);
  TestValidator.equals(
    "reports with reason containing 'spam' should return matching reports",
    () =>
      reasonFilteredReports.data.every((r) =>
        r.reason.toLowerCase().includes("spam"),
      ),
    () => true,
  );
  TestValidator.predicate(
    "reason filtered reports list is not empty",
    () => reasonFilteredReports.data.length > 0,
  );
  TestValidator.equals(
    "the filtered report should be a post report",
    () =>
      reasonFilteredReports.data.every((r) => r.target_type === "post"),
    () => true,
  );
  // 13. Moderator filters by reporterId
  const reporterFilteredReports =
    await api.functional.redditLikeCommunity.member.reports.community.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          reporterId: subscriberAuth.id,
        } satisfies IREdditLikeCommunityReport.IRequest,
      },
    );
  typia.assert(reporterFilteredReports);
  TestValidator.equals(
    "all filtered reports should be filed by the subscriber",
    () =>
      reporterFilteredReports.data.every(
        (r) => r.reportedBy.id === subscriberAuth.id,
      ),
    () => true,
  );
  TestValidator.predicate(
    "reporter filtered reports list contains all reported items",
    () => reporterFilteredReports.data.length === 2,
  );
}