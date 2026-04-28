import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
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
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test that viewing a profile includes properly populated nested activity collections when the user has created content.
 *
 * Validates the complete profile activity workflow: member registration, community creation, community subscription, post creation, comment creation, and finally profile retrieval. Ensures that the profile correctly contains all nested activity data.
 *
 * Special attention is given to verifying that the posts array contains at least one post summary with title, post_type, community reference, vote_score, and comment_count. The comments array contains at least one comment summary with body and author reference. All nested objects are properly populated with summary types.
 *
 * 1. Member joins and authenticates with email, password, and username.
 * 2. Member creates a community with name and description.
 * 3. Member subscribes to the created community.
 * 4. Member creates a post in the community.
 * 5. Member creates a comment on their post.
 * 6. Member retrieves their profile by profileId.
 * 7. Validates profile contains display_name and bio from initialization.
 * 8. Validates karma score is 0 or higher.
 * 9. Validates posts array contains at least one post summary.
 * 10. Validates comments array contains at least one comment summary.
 * 11. Validates deleted_at is null confirming active profile status.
 */
export async function test_api_profile_view_with_rich_activity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create a community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies DeepPartial<IREdditLikeCommunityCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          community_id: community.id,
          body: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IREdditLikeCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment: IRedditLikeCommunityPostComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Retrieve the profile by profileId
  const profile: IREdditLikeCommunityProfile =
    await api.functional.redditLikeCommunity.community_profiles.at(
      memberConnection,
      {
        profileId: post.author.id,
      },
    );
  typia.assert(profile);
  // 7. Validate profile contains display_name and bio
  TestValidator.predicate(
    "profile has display_name or bio set",
    profile.display_name !== null || profile.bio !== null,
  );
  // 8. Validate karma score is 0 or higher
  TestValidator.predicate("karma score is 0 or higher", profile.karma >= 0);
  // 9. Validate posts array contains at least one post summary
  TestValidator.predicate("posts array is not empty", profile.posts.length > 0);
  // 10. Validate comments array contains at least one comment summary
  TestValidator.predicate(
    "comments array is not empty",
    profile.comments.length > 0,
  );
  // 11. Validate deleted_at is null confirming active profile status
  TestValidator.equals("profile is active", profile.deleted_at, null);
}
