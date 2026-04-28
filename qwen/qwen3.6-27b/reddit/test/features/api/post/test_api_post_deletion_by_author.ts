import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
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
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test that an authenticated author can successfully delete their own post.
 *
 * Validates the complete post deletion flow including member authentication, community creation, community subscription, post creation, and post deletion by the original author. Ensures that the DELETE operation succeeds for the post owner and confirms soft-delete persistence by verifying that a repeated deletion request is properly rejected.
 *
 * The test confirms that the author must be authenticated, subscribed to the community, and that the deletion operation returns without error. It also validates that already-deleted posts cannot be deleted again, confirming the soft-delete state is maintained.
 *
 * 1. Member authenticates via join endpoint and receives JWT token.
 * 2. Member creates a community as the creator.
 * 3. Member subscribes to their own community (required prerequisite for post creation).
 * 4. Member creates a text post within the subscribed community.
 * 5. Member deletes their own post using the post ID — succeeds silently (void response).
 * 6. Attempting to delete the same post again fails with 404, confirming soft-delete persisted.
 */
export async function test_api_post_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate the post author member
  const authorConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const authorizedMember = await authorize_member_join(authorConnection, {
    body: joinBody,
  });
  typia.assert(authorizedMember);
  // 2. Create a community as the authenticated author
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Subscribe the author to the community (required for post creation)
  const subscriptionBody = {
    community_id: community.id,
  } satisfies IRedditLikeCommunityCommunitySubscription.ICreate;
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      authorConnection,
      { body: subscriptionBody },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community as the author
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post has no deleted_at before deletion",
    post.deleted_at,
    null,
  );
  // 5. Author deletes their own post — succeeds with void response
  await api.functional.redditLikeCommunity.member.posts.erase(
    authorConnection,
    {
      postId: post.id,
    },
  );
  // 6. Verify soft-delete persisted: attempting to delete again should fail with 404
  await TestValidator.httpError(
    "already deleted post returns 404",
    404,
    async () =>
      await api.functional.redditLikeCommunity.member.posts.erase(
        authorConnection,
        { postId: post.id },
      ),
  );
}
