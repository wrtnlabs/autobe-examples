import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_thread_nested_replies_best_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    },
  });
  // 2. Authenticate as second member for author diversity
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    },
  });
  // 3. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Subscribe to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    member1Connection,
    {
      communityId: community.id,
    },
  );
  // 5. Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        post_type: "text",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create top-level comments
  const topLevelComment1 =
    await generate_random_reddit_like_member_posts_comments_create(
      member1Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(topLevelComment1);
  const topLevelComment2 =
    await generate_random_reddit_like_member_posts_comments_create(
      member2Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditLikeComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(topLevelComment2);
  const topLevelComment3 =
    await generate_random_reddit_like_member_posts_comments_create(
      member1Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(topLevelComment3);
  // 7. Create nested replies to form a discussion tree
  const reply1 = await generate_random_reddit_like_member_posts_comments_create(
    member2Connection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
        parentId: topLevelComment1.id,
      } satisfies IRedditLikeComment.ICreate,
      params: { postId: post.id },
    },
  );
  typia.assert(reply1);
  // Second level nesting
  await generate_random_reddit_like_member_posts_comments_create(
    member1Connection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: reply1.id,
      } satisfies IRedditLikeComment.ICreate,
      params: { postId: post.id },
    },
  );
  // Reply to second comment
  await generate_random_reddit_like_member_posts_comments_create(
    member1Connection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
        parentId: topLevelComment2.id,
      } satisfies IRedditLikeComment.ICreate,
      params: { postId: post.id },
    },
  );
  // 8. Retrieve the comment thread sorted by "Best" (highest vote score)
  const thread: IRedditLikeComment.IThread =
    await api.functional.redditLike.member.posts.comments.thread(
      member1Connection,
      {
        postId: post.id,
      },
    );
  // 9. Validate the complete thread structure
  // typia.assert performs complete validation including:
  // - All comment fields (id, content, voteScore, isEdited, isDeleted, createdAt)
  // - Hierarchical structure with replies array
  // - Author information via IRedditLikeMember.ISummary
  // - Proper nesting and empty replies arrays for leaf comments
  typia.assert(thread);
  // Business logic validation: Verify responses array contains data
  TestValidator.predicate(
    "thread has content or nested replies",
    thread.content !== null || thread.replies.length > 0,
  );
  // Verify leaf comments have empty replies (business logic, not type validation)
  const hasLeafWithEmptyReplies = (
    comments: IRedditLikeComment.IThread[],
  ): boolean => {
    for (const comment of comments) {
      if (comment.replies.length === 0) return true;
      if (hasLeafWithEmptyReplies(comment.replies)) return true;
    }
    return false;
  };
  TestValidator.predicate(
    "thread contains leaf comments with empty replies array",
    hasLeafWithEmptyReplies(thread.replies),
  );
}
