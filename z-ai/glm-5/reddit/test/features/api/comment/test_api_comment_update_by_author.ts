import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authResult);
  // Setup: Create community (member becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // Setup: Subscribe to the created community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Setup: Create a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        contentType: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // Setup: Create a comment on the post
  const originalContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: originalContent,
        },
      },
    );
  typia.assert(comment);
  // Prepare updated content (different from original)
  const updatedContent = RandomGenerator.paragraph({
    sentences: 4,
  }) satisfies ICommunityPlatformComment.IUpdate["content"];
  TestValidator.notEquals(
    "content should be different",
    originalContent,
    updatedContent,
  );
  // Store original values for comparison
  const originalCommentId = comment.id;
  const originalScore = comment.score;
  const originalAuthorId = comment.author.id;
  const originalPostId = comment.post.id;
  const originalCreatedAt = comment.created_at;
  // Test: Update the comment content
  const updatedComment =
    await api.functional.communityPlatform.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: updatedContent,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Validation: Content was updated
  TestValidator.equals(
    "comment content should be updated",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.notEquals(
    "comment content should differ from original",
    updatedComment.content,
    originalContent,
  );
  // Validation: Immutable fields remain unchanged
  TestValidator.equals(
    "comment id should remain unchanged",
    updatedComment.id,
    originalCommentId,
  );
  TestValidator.equals(
    "score should remain unchanged",
    updatedComment.score,
    originalScore,
  );
  TestValidator.equals(
    "author should remain unchanged",
    updatedComment.author.id,
    originalAuthorId,
  );
  TestValidator.equals(
    "post should remain unchanged",
    updatedComment.post.id,
    originalPostId,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedComment.created_at,
    originalCreatedAt,
  );
  // Validation: updated_at reflects the update time
  TestValidator.predicate(
    "updated_at should be at least created_at",
    updatedComment.updated_at >= originalCreatedAt,
  );
}
