import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_comment_retrieval_reply_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8) + "_community",
          description: "Test community for reply validation",
        },
      },
    );
  typia.assert(community);
  // 3. Create text post in community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create root comment (no parent)
  const rootComment =
    await generate_random_reddit_platform_member_comments_create(
      memberConnection,
      {
        body: {
          reddit_platform_post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(rootComment);
  // 5. Create reply comment to root comment
  const replyComment =
    await generate_random_reddit_platform_member_comments_create(
      memberConnection,
      {
        body: {
          reddit_platform_post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
          reddit_platform_comments_id: rootComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // 6. Retrieve reply comment and validate parent context
  // Using memberConnection for API call (even though public, we use authenticated connection consistently)
  const retrievedComment =
    await api.functional.redditPlatform.posts.comments.at(memberConnection, {
      postId: post.id,
      commentId: replyComment.id,
    });
  typia.assert(retrievedComment);
  // 7. Validate HTTP response structure
  TestValidator.equals(
    "comment id matches",
    retrievedComment.id,
    replyComment.id,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    replyComment.content,
  );
  TestValidator.equals(
    "post id matches",
    retrievedComment.reddit_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "author id matches",
    retrievedComment.reddit_platform_member_id,
    memberAuth.id,
  );
  // 8. Validate parent reference for reply
  TestValidator.predicate(
    "parent is not null",
    retrievedComment.parent !== null && retrievedComment.parent !== undefined,
  );
  TestValidator.equals(
    "parent id matches root",
    retrievedComment.parent!.id,
    rootComment.id,
  );
  TestValidator.equals(
    "parent content matches",
    retrievedComment.parent!.content,
    rootComment.content,
  );
  TestValidator.equals(
    "parent author id matches",
    retrievedComment.parent!.author.id,
    rootComment.author.id,
  );
  TestValidator.equals(
    "parent author username matches",
    retrievedComment.parent!.author.username,
    rootComment.author.username,
  );
  // 9. Validate post context
  TestValidator.equals(
    "post title in context",
    retrievedComment.post.title,
    post.title,
  );
  TestValidator.equals(
    "post type matches",
    retrievedComment.post.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "post author matches",
    retrievedComment.post.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "post community matches",
    retrievedComment.post.community.id,
    post.community.id,
  );
  // 10. Validate vote metrics (should be 0 for new comment)
  TestValidator.equals("upvotes count is 0", retrievedComment.upvotes_count, 0);
  TestValidator.equals(
    "downvotes count is 0",
    retrievedComment.downvotes_count,
    0,
  );
  TestValidator.equals("score is 0", retrievedComment.score, 0);
  TestValidator.equals("reply count is 0", retrievedComment.comment_count, 0);
  // 11. Validate timestamps are ISO 8601 formatted
  const createdAt = new Date(retrievedComment.created_at);
  const updatedAt = new Date(retrievedComment.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  // 12. Validate soft-deletion field is null (active comment)
  TestValidator.equals(
    "comment is not deleted",
    retrievedComment.deleted_at,
    null,
  );
}
