import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test that soft-deleted posts remain publicly accessible.
 * 1. Create member account
 * 2. Create community
 * 3. Subscribe to community
 * 4. Create post
 * 5. Soft-delete post
 * 6. Retrieve deleted post without authentication
 * 7. Validate content preservation and deleted_at timestamp
 */
export async function test_api_post_soft_deleted_public_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Subscribe to community
  const subscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberConnection,
      {
        body: { confirmSubscription: true },
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // Step 4: Create post
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "TEXT" as const,
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Soft-delete post
  await api.functional.redditPlatform.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // Step 6: Retrieve deleted post WITHOUT authentication (public access)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedPost = await api.functional.redditPlatform.posts.at(
    publicConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // Step 7: Validate
  TestValidator.equals("post id preserved", retrievedPost.id, post.id);
  TestValidator.equals("title preserved", retrievedPost.title, post.title);
  TestValidator.equals(
    "content preserved",
    retrievedPost.content,
    post.content,
  );
  TestValidator.equals(
    "post type preserved",
    retrievedPost.postType,
    post.postType,
  );
  TestValidator.equals(
    "vote score preserved",
    retrievedPost.voteScore,
    post.voteScore,
  );
  TestValidator.equals(
    "comment count preserved",
    retrievedPost.commentCount,
    post.commentCount,
  );
  // Validate deleted_at is set
  TestValidator.predicate(
    "deleted_at should be set for soft-deleted post",
    () =>
      retrievedPost.deletedAt !== null && retrievedPost.deletedAt !== undefined,
  );
  // Validate author and community information preserved
  TestValidator.equals(
    "author id preserved",
    retrievedPost.author.id,
    member.id,
  );
  TestValidator.equals(
    "author username preserved",
    retrievedPost.author.username,
    member.username,
  );
  TestValidator.equals(
    "community id preserved",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name preserved",
    retrievedPost.community.name,
    community.name,
  );
}
