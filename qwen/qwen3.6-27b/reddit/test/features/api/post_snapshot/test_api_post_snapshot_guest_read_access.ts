import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPostSnapshot";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
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
 * Tests that an unauthenticated guest user can read the list of post snapshots for a valid, existing post.
 *
 * Validates the public read access to post snapshot history without requiring authentication or membership. Confirms that guests can view historical versions of a post, including title, content type, author, community context, and creation timestamp.
 *
 * 1. Administrator registers a member account to set up test data.
 * 2. Member creates a community for hosting the test post.
 * 3. Member subscribes to the community to gain posting privileges.
 * 4. Member creates a text post within the subscribed community.
 * 5. Unauthenticated guest requests the paginated list of snapshots for the created post.
 * 6. Validates that the guest successfully receives snapshot data containing at least the initial post state, confirming public visibility of post history and metadata.
 */
export async function test_api_post_snapshot_guest_read_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate a member to create test data
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(),
    },
  });
  // 2. Create a community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a post
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Guest access: Create a fresh connection without auth headers
  const guestConnection: api.IConnection = { host: connection.host };
  // 6. Request snapshots for the post
  const snapshots =
    await api.functional.redditLikeCommunity.posts.snapshots.index(
      guestConnection,
      {
        postId: post.id,
        body: {
          sort: "created_at",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate the response
  TestValidator.predicate(
    "guest can read post snapshots",
    snapshots.data.length >= 1,
  );
}