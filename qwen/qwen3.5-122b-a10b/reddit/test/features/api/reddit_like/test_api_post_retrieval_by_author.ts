import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
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
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test post retrieval by author with complete entity composition.
 *
 * Validates the complete post retrieval workflow including member authentication, community creation, post publication, and detailed post retrieval. Ensures that the retrieved post contains all expected fields with correct data types and relationships.
 *
 * The test verifies that post retrieval returns comprehensive information including author details, community context, computed metrics (vote score and comment count), and proper timestamp handling. This validates the primary success path for the post retrieval endpoint with full entity composition.
 *
 * 1. Member registers and authenticates with randomized credentials.
 * 2. Member creates a new community with unique name and description.
 * 3. Member publishes a text post in the created community.
 * 4. Member retrieves the post details using the post ID.
 * 5. Validates all post fields including author, community, content, and metrics.
 */
export async function test_api_post_retrieval_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: `community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create text post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Retrieve post details
  const retrievedPost = await api.functional.redditLike.member.posts.at(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // 5. Validate post fields
  TestValidator.equals("post ID matches", retrievedPost.id, post.id);
  TestValidator.equals("title matches", retrievedPost.title, post.title);
  TestValidator.equals(
    "content type is text",
    retrievedPost.content_type,
    "text",
  );
  TestValidator.equals(
    "content text exists",
    retrievedPost.content_text,
    post.content_text,
  );
  TestValidator.equals("author ID matches", retrievedPost.author.id, member.id);
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    member.username,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  TestValidator.predicate("vote score is zero", retrievedPost.vote_score === 0);
  TestValidator.predicate(
    "comment count is zero",
    retrievedPost.comments_count === 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !!retrievedPost.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !!retrievedPost.updated_at,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedPost.deleted_at === null,
  );
}
