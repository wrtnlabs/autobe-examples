import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
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
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test the primary success path for creating a top-level comment on an active post.
 *
 * Validates the core comment writing workflow where authenticated members can participate in post discussions. A member should be able to write a comment with non-empty text content on any existing, non-deleted post. The system should return the newly created comment with full entity data including generated ID, timestamps, author information, post association, and initial vote score of 0.
 *
 * This test validates the complete flow from member authentication through community and post creation, culminating in successful top-level comment submission. It ensures all entity relationships are correctly established and response data conforms to the IRedditLikeComment type specification.
 *
 * 1. Authenticate a member account with valid credentials using authorize_member_join
 * 2. Create a community for posting using generate_random_reddit_like_member_communities_create
 * 3. Create a text post in the community using generate_random_reddit_like_member_posts_create
 * 4. Create a top-level comment on the post with non-empty content using generate_random_reddit_like_member_posts_comments_create
 * 5. Validate the comment response contains all required fields with correct types
 * 6. Verify initial vote_score is 0 and timestamps are valid ISO datetime strings
 */
export async function test_api_comment_creation_top_level_on_active_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create top-level comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Validate comment structure and business logic
  TestValidator.equals(
    "comment has valid ID format",
    typeof comment.id,
    "string",
  );
  TestValidator.predicate(
    "comment content is non-empty",
    comment.content.length > 0,
  );
  TestValidator.predicate("initial vote score is 0", comment.vote_score === 0);
  TestValidator.predicate(
    "comment has author reference",
    comment.author !== null,
  );
  TestValidator.predicate("comment has post reference", comment.post !== null);
  TestValidator.predicate(
    "created_at is valid datetime",
    typeof comment.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    typeof comment.updated_at === "string",
  );
}
