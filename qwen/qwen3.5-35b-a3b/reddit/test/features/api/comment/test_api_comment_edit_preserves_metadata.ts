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

export async function test_api_comment_edit_preserves_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const authConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: "12345678",
      href: "https://example.com/join",
      referrer: "https://google.com",
    },
  });
  typia.assert(member);
  // 2. Create community with member connection
  const community =
    await generate_random_reddit_platform_member_communities_create(
      authConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: "Test community for comment edit preservation",
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      authConnection,
      {
        body: { confirmSubscription: true },
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create post in subscribed community
  const post = await generate_random_reddit_platform_member_posts_create(
    authConnection,
    {
      body: {
        title: "Test Post for Comment Edit",
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content:
          "This is the post content for testing comment edit preservation.",
      },
    },
  );
  typia.assert(post);
  // 5. Create comment on the post
  const originalContent =
    "Original comment content for testing edit preservation.";
  const comment = await generate_random_reddit_platform_member_comments_create(
    authConnection,
    {
      body: {
        content: originalContent,
        post_id: post.id,
      },
    },
  );
  typia.assert(comment);
  // 6. Store original metadata before edit
  const originalId = comment.id;
  const originalAuthorId = comment.author_id;
  const originalPostId = comment.post_id;
  const originalParentId = comment.parent_id;
  const originalCreatedAt = comment.created_at;
  const originalVoteScore = comment.vote_score;
  const originalDeletedAt = comment.deleted_at;
  const originalUpdatedAt = comment.updated_at;
  // 7. Update comment content
  const newContent =
    "Updated comment content with new text for preservation testing.";
  const updatedComment =
    await api.functional.redditPlatform.member.comments.update(authConnection, {
      commentId: comment.id,
      body: { content: newContent },
    });
  typia.assert(updatedComment);
  // 8. Verify metadata preservation
  TestValidator.equals("comment id preserved", updatedComment.id, originalId);
  TestValidator.equals(
    "author_id preserved",
    updatedComment.author_id,
    originalAuthorId,
  );
  TestValidator.equals(
    "author unchanged",
    updatedComment.author,
    comment.author,
  );
  TestValidator.equals(
    "post_id preserved",
    updatedComment.post_id,
    originalPostId,
  );
  TestValidator.equals(
    "parent_id preserved",
    updatedComment.parent_id,
    originalParentId,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "vote_score unchanged",
    updatedComment.vote_score,
    originalVoteScore,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedComment.deleted_at,
    originalDeletedAt,
  );
  TestValidator.equals("content updated", updatedComment.content, newContent);
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdatedAt,
    updatedComment.updated_at,
  );
}
