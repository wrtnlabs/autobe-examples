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
 * Test creating a nested reply comment to an existing comment on a post.
 *
 * Validates the threaded discussion feature where users can engage in multi-level conversations by replying to existing comments. The test ensures that the system properly maintains parent-child relationships in comment threading and that replies correctly inherit post associations from their parent comments.
 *
 * This test validates the complete comment creation workflow including:
 * 1. Member authentication and authorization
 * 2. Community and post setup
 * 3. Parent comment creation
 * 4. Nested reply comment creation with parent reference
 * 5. Validation of comment threading structure and relationships
 *
 * Special attention is given to verifying that the parent comment ID is correctly maintained in the reply and that the post association is properly inherited from the parent comment's context.
 *
 * 1. Authenticate a member account for comment creation.
 * 2. Create a community for posting content.
 * 3. Create a text post in the community.
 * 4. Create a parent comment on the post (top-level comment).
 * 5. Create a reply comment to the parent comment with parentId set.
 * 6. Validates the reply comment has correct parent reference and post association.
 */
export async function test_api_comment_creation_nested_reply_to_existing_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
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
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
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
        title: RandomGenerator.name(3),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create parent comment (top-level)
  const parentComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(parentComment);
  // 5. Create reply comment to parent
  const replyComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentComment.id,
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(replyComment);
  // 6. Validate reply comment structure
  TestValidator.equals(
    "reply has parent reference",
    replyComment.parent?.id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply belongs to same post",
    replyComment.post.id,
    post.id,
  );
  TestValidator.predicate(
    "reply has valid content",
    replyComment.content.length > 0,
  );
  TestValidator.predicate(
    "reply has valid author",
    replyComment.author.id === member.id,
  );
}
