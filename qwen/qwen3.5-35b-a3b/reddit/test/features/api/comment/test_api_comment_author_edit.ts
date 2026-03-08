import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_author_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create and subscribe to community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  await generate_random_reddit_platform_member_communities_subscribe(
    memberConnection,
    {
      body: { confirmSubscription: true },
      params: { communityId: community.id },
    },
  );
  // 3. Create post in the community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create initial comment on the post
  const initialContent = "This is the initial comment content";
  const comment = await generate_random_reddit_platform_member_comments_create(
    memberConnection,
    {
      body: {
        content: initialContent,
        post_id: post.id,
      },
    },
  );
  typia.assert(comment);
  typia.assertGuard(comment);
  const createdAtBeforeUpdate = comment.created_at;
  const updatedAtBeforeUpdate = comment.updated_at;
  const authorId = comment.author_id;
  const postId = comment.post_id;
  const parentId = comment.parent_id;
  // 5. Edit the comment (same author)
  const newContent = "This is the updated comment content after editing";
  const editedComment =
    await api.functional.redditPlatform.member.comments.update(
      memberConnection,
      {
        commentId: comment.id,
        body: { content: newContent },
      },
    );
  typia.assert(editedComment);
  // 6. Validation
  // Content should be updated
  TestValidator.equals(
    "comment content is updated",
    editedComment.content,
    newContent,
  );
  // updated_at should change after edit
  TestValidator.notEquals(
    "updated_at timestamp changed after edit",
    updatedAtBeforeUpdate,
    editedComment.updated_at,
  );
  // created_at should remain unchanged
  TestValidator.equals(
    "created_at timestamp unchanged after edit",
    createdAtBeforeUpdate,
    editedComment.created_at,
  );
  // Author should remain the same
  TestValidator.equals(
    "comment author remains same after edit",
    authorId,
    editedComment.author_id,
  );
  // Relationships should be preserved
  TestValidator.equals(
    "post_id is preserved after edit",
    postId,
    editedComment.post_id,
  );
  TestValidator.equals(
    "parent_id is preserved after edit",
    parentId,
    editedComment.parent_id,
  );
}