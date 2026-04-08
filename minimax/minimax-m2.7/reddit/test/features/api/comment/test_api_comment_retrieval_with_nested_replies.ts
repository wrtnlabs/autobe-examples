import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reddit_clone_comments_replies_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_comments_replies_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_comment_retrieval_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 4. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  // 5. Create parent comment
  const parentComment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  // 6. Create nested replies (Level 1)
  const level1Reply1 =
    await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          commentId: parentComment.id,
        },
      },
    );
  const level1Reply2 =
    await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          commentId: parentComment.id,
        },
      },
    );
  // Create nested reply to Level 1 (Level 2)
  const level2Reply =
    await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          commentId: level1Reply1.id,
        },
      },
    );
  // Create nested reply to Level 2 (Level 3)
  await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
    memberConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
      },
      params: {
        commentId: level2Reply.id,
      },
    },
  );
  // 7. Retrieve the parent comment with nested replies via public endpoint
  const comment =
    await api.functional.redditClone.redditClone.posts.comments.at(connection, {
      postId: post.id,
      commentId: parentComment.id,
    });
  typia.assert(comment);
  // 8. Validate response structure
  TestValidator.equals("comment id matches", comment.id, parentComment.id);
  TestValidator.equals("content is not null", comment.content !== null, true);
  TestValidator.predicate(
    "voteScore is number",
    typeof comment.voteScore === "number",
  );
  TestValidator.predicate(
    "createdAt exists",
    typeof comment.createdAt === "string",
  );
  // 9. Validate author matches creator
  TestValidator.equals("author id matches", comment.author.id, member.id);
  TestValidator.equals(
    "author username matches",
    comment.author.username,
    member.username,
  );
  // 10. Validate post details
  TestValidator.equals("post id matches", comment.post.id, post.id);
  TestValidator.equals("post title matches", comment.post.title, post.title);
  // 11. Validate nested replies are recursively included
  TestValidator.predicate("replies is array", Array.isArray(comment.replies));
  TestValidator.equals("has 2 level-1 replies", comment.replies.length, 2);
  // 12. Validate first level-1 reply structure
  const firstReply = comment.replies[0];
  TestValidator.equals(
    "reply id matches level1Reply1",
    firstReply.id,
    level1Reply1.id,
  );
  TestValidator.predicate(
    "reply has author",
    typeof firstReply.author === "object",
  );
  TestValidator.equals(
    "reply author id matches",
    firstReply.author.id,
    member.id,
  );
  TestValidator.predicate(
    "reply has voteScore",
    typeof firstReply.voteScore === "number",
  );
  TestValidator.predicate(
    "reply has createdAt",
    typeof firstReply.createdAt === "string",
  );
  // 13. Validate recursive nesting - level 2 reply exists
  TestValidator.predicate(
    "level-1 reply has replies",
    Array.isArray(firstReply.replies),
  );
  TestValidator.equals(
    "level-2 reply exists",
    firstReply.replies.length >= 1,
    true,
  );
  const level2ReplyInTree = firstReply.replies[0];
  TestValidator.equals(
    "level-2 reply id matches",
    level2ReplyInTree.id,
    level2Reply.id,
  );
  // 14. Validate level 3 nesting exists
  TestValidator.predicate(
    "level-2 reply has replies",
    Array.isArray(level2ReplyInTree.replies),
  );
  TestValidator.equals(
    "level-3 reply exists",
    level2ReplyInTree.replies.length >= 1,
    true,
  );
  // 15. Validate timestamps are properly formatted
  TestValidator.predicate(
    "parent comment timestamp format valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(comment.createdAt),
  );
  TestValidator.predicate(
    "reply timestamp format valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstReply.createdAt),
  );
}
