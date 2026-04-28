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
import { generate_random_reddit_like_community_member_profile_create } from "../../../generate/generate_random_reddit_like_community_member_profile_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_profile } from "../../../prepare/prepare_random_reddit_like_community_profile";
import { prepare_random_reddit_like_community_profile_image } from "../../../prepare/prepare_random_reddit_like_community_profile_image";

/**
 * Test profile endpoint's aggregated activity display showing member's posts and comments.
 *
 * Validates that a member's profile correctly aggregates and displays their content activity
 * including posts and comments across communities. The profile is publicly accessible to
 * all platform participants. Ensures the aggregated collections only contain active,
 * non-deleted content ordered by creation time.
 *
 * Special attention is given to verifying that the posts array includes created post
 * summaries with title, post_type, author, and community references, and that the
 * comments array includes written comment summaries with body and author information.
 *
 * 1. Member registers an account and authenticates.
 * 2. Member initializes their public profile with display name and bio.
 * 3. Member creates a community and subscribes to it.
 * 4. Member creates a post in the community.
 * 5. Member writes a comment on their post.
 * 6. Profile is retrieved by profileId via a separate connection.
 * 7. Validates posts array contains the created post summary.
 * 8. Validates comments array contains the written comment summary.
 * 9. Validates post summary includes title, post_type, author, and community.
 * 10. Validates comment summary includes body and author.
 */
export async function test_api_profile_aggregated_activity_display(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(actorConnection, {
    body: {},
  });
  typia.assert(memberAuth);
  const profile =
    await generate_random_reddit_like_community_member_profile_create(
      actorConnection,
      {
        body: {
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(profile);
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      actorConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    actorConnection,
    {
      body: { community_id: community.id },
    },
  );
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const post = await generate_random_reddit_like_community_member_posts_create(
    actorConnection,
    {
      body: {
        title: postTitle,
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  const commentBody = RandomGenerator.paragraph({ sentences: 4 });
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      actorConnection,
      {
        params: { postId: post.id },
        body: { body: commentBody },
      },
    );
  typia.assert(comment);
  const viewerConnection: api.IConnection = { host: connection.host };
  const retrievedProfile = await api.functional.redditLikeCommunity.profiles.at(
    viewerConnection,
    {
      profileId: profile.id,
    },
  );
  typia.assert(retrievedProfile);
  TestValidator.equals("profile id matches", retrievedProfile.id, profile.id);
  TestValidator.equals(
    "member id matches",
    retrievedProfile.member.id,
    memberAuth.id,
  );
  if (retrievedProfile.posts.length === 0) {
    throw new Error(
      "Profile posts array is empty; expected at least the created post.",
    );
  }
  const matchingPost = retrievedProfile.posts.find((p) => p.id === post.id);
  if (!matchingPost) {
    throw new Error("Created post not found in profile posts array.");
  }
  TestValidator.equals("post title matches", matchingPost.title, postTitle);
  TestValidator.equals("post type is text", matchingPost.post_type, "text");
  TestValidator.equals("post author id", matchingPost.author.id, memberAuth.id);
  TestValidator.equals(
    "post community id",
    matchingPost.community.id,
    community.id,
  );
  if (retrievedProfile.comments.length === 0) {
    throw new Error(
      "Profile comments array is empty; expected at least the created comment.",
    );
  }
  const matchingComment = retrievedProfile.comments.find(
    (c) => c.id === comment.id,
  );
  if (!matchingComment) {
    throw new Error("Created comment not found in profile comments array.");
  }
  TestValidator.equals(
    "comment body matches",
    matchingComment.body,
    commentBody,
  );
  TestValidator.equals(
    "comment author id",
    matchingComment.author.id,
    memberAuth.id,
  );
}
