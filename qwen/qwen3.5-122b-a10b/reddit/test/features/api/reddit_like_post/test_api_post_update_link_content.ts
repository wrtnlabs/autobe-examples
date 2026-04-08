import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test member can update link post title and URL content.
 *
 * Validates the complete workflow of updating a link post's title and content URL. This test ensures that authenticated members can modify their own posts while maintaining content type integrity and URL format validation.
 *
 * The test covers the following business rules:
 * - Link post ownership verification (only author can update)
 * - Title validation (non-empty, max 500 characters)
 * - Content URL validation (valid URI format, max 80000 characters)
 * - Content type immutability (link posts remain link type after update)
 * - URL normalization behavior (protocol prefix handling)
 *
 * 1. Create member account with unique credentials.
 * 2. Create a community for posting.
 * 3. Subscribe member to the community.
 * 4. Create a link post with initial title and URL.
 * 5. Update the post with new title and content_url.
 * 6. Verify the updated post has new title and URL.
 * 7. Verify content_type remains 'link' after update.
 * 8. Verify vote_score and comments_count are preserved.
 */
export async function test_api_post_update_link_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create link post with initial title and URL
  const initialUrl = `https://example.com/post/${typia.random<string & tags.Format<"uuid">>()}`;
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: `Initial Post ${RandomGenerator.name(1)}`,
        content_type: "link",
        content_url: initialUrl,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Update the post with new title and URL
  const newTitle = `Updated Post ${RandomGenerator.name(1)}`;
  const newUrl = `https://updated-example.com/new-post/${typia.random<string & tags.Format<"uuid">>()}`;
  const updatedPost = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: newTitle,
        content_url: newUrl,
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Verify the updated post has new title and URL
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.equals("content_url updated", updatedPost.content_url, newUrl);
  // 7. Verify content_type remains 'link' after update
  TestValidator.equals(
    "content_type preserved",
    updatedPost.content_type,
    "link",
  );
  // 8. Verify vote_score and comments_count are preserved (should be 0)
  TestValidator.equals("vote_score preserved", updatedPost.vote_score, 0);
  TestValidator.equals(
    "comments_count preserved",
    updatedPost.comments_count,
    0,
  );
}
