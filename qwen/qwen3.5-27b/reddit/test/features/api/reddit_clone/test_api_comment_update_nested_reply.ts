import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a member can successfully update a nested reply comment.
 * 1. Member joins and authenticates
 * 2. Member creates a community
 * 3. Member creates a post in the community
 * 4. Member creates a top-level comment on the post
 * 5. Member creates a nested reply to the top-level comment
 * 6. Member updates the nested reply's content
 * 7. Verify the update preserves parent relationship, timestamps, and score
 */
export async function test_api_comment_update_nested_reply(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Create a top-level comment on the post
  const topLevelComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        },
      },
    );
  typia.assert(topLevelComment);
  // 5. Create a nested reply to the top-level comment
  const originalContent = RandomGenerator.paragraph({ sentences: 2 });
  const nestedReply =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: originalContent,
          parent_id: topLevelComment.id,
        },
      },
    );
  typia.assert(nestedReply);
  // Store original values for validation
  const originalCreatedAt = nestedReply.created_at;
  const originalScore = nestedReply.score;
  const originalParentId = nestedReply.parent?.id;
  // 6. Update the nested reply's content
  const updatedContent = RandomGenerator.paragraph({ sentences: 4 });
  const updateBody = {
    content: updatedContent,
  } satisfies IRedditCloneComment.IUpdate;
  const updatedReply =
    await api.functional.redditClone.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: nestedReply.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReply);
  // 7. Verify the update preserves parent relationship
  TestValidator.equals(
    "parent relationship preserved",
    updatedReply.parent?.id,
    originalParentId,
  );
  // 8. Verify the original creation timestamp is preserved
  TestValidator.equals(
    "creation timestamp preserved",
    updatedReply.created_at,
    originalCreatedAt,
  );
  // 9. Verify the vote score is maintained
  TestValidator.equals(
    "vote score maintained",
    updatedReply.score,
    originalScore,
  );
  // 10. Verify the updated content is reflected
  TestValidator.equals("content updated", updatedReply.content, updatedContent);
  // 11. Verify the parent comment reference is correct
  TestValidator.equals(
    "parent comment reference correct",
    updatedReply.parent?.id,
    topLevelComment.id,
  );
  // 12. Verify the updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedReply.created_at,
    updatedReply.updated_at,
  );
}
