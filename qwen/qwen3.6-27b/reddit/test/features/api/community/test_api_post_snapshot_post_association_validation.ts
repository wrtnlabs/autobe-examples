import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import type { IRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostSnapshot";
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
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test post snapshot retrieval and validation of snapshot-to-post associations.
 *
 * Validates that a snapshot retrieved by postId and snapshotId correctly belongs to the specified post by verifying content preservation and relationship integrity. Authenticates as a member, creates a community, subscribes to it, and creates a text post that generates an initial snapshot at publication. The snapshot is then retrieved and its fields are compared against the original post data.
 *
 * Special attention is given to verifying that the snapshot preserves the post's title, post_type, and body content exactly, and that the denormalized community and author references in the snapshot match the corresponding references from the post's own community and author fields.
 *
 * 1. Authenticate as a member with randomized credentials for resource creation.
 * 2. Create a community and subscribe the member to gain posting privileges.
 * 3. Create a text post with specific title and body content.
 * 4. Retrieve the initial post snapshot using the post ID for both postId and snapshotId parameters.
 * 5. Validate snapshot content (title, post_type, body) matches the original post.
 * 6. Validate snapshot community and author references match the post's context.
 */
export async function test_api_post_snapshot_post_association_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to create post resources
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create a community for the post
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for post creation)
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a post that generates an initial snapshot at publication
  const postTitle = "Snapshot Association Test Post";
  const postBody = RandomGenerator.paragraph({ sentences: 3 });
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: postTitle,
        post_type: "text",
        community_id: community.id,
        body: postBody,
      },
    },
  );
  typia.assert(post);
  // 5. Retrieve the snapshot using the post ID
  // Initial snapshot is assumed to use the post ID as its snapshotId
  const unauthConnection: api.IConnection = { host: memberConnection.host };
  const snapshot = await api.functional.redditLikeCommunity.posts.snapshots.at(
    unauthConnection,
    {
      postId: post.id,
      snapshotId: post.id,
    },
  );
  typia.assert(snapshot);
  // 6. Validate snapshot content matches original post data
  TestValidator.equals(
    "snapshot title matches post title",
    snapshot.title,
    post.title,
  );
  TestValidator.equals(
    "snapshot post_type matches post type",
    snapshot.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "snapshot body matches post body",
    snapshot.body,
    postBody,
  );
  // 7. Validate snapshot community reference matches the post's community
  TestValidator.equals(
    "snapshot community id matches",
    snapshot.community.id,
    community.id,
  );
  // 8. Validate snapshot author reference matches the authenticated member
  TestValidator.equals(
    "snapshot author id matches authenticated member",
    snapshot.author.id,
    member.id,
  );
}
