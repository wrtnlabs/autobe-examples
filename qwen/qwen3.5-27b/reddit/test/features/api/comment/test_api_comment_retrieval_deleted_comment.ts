import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that retrieving a soft-deleted comment returns 404 error.
 *
 * Validates the complete comment lifecycle including member registration, community subscription, post creation, comment creation, and comment deletion. Ensures that soft-deleted comments are not retrievable through the profile endpoint, enforcing privacy and content moderation requirements.
 *
 * Special attention is given to verifying that the deleted_at timestamp check prevents access to deleted content, even when accessing through the owner's profile.
 *
 * 1. Member registers with email, password, and unique username.
 * 2. Member subscribes to an existing community.
 * 3. Member creates a post in the subscribed community.
 * 4. Member creates a comment on the post.
 * 5. Member deletes the comment (soft delete).
 * 6. Attempts to retrieve the deleted comment via profile endpoint.
 * 7. Validates that the retrieval returns HTTP 404 Not Found.
 */
export async function test_api_comment_retrieval_deleted_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
      username: RandomGenerator.name(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Subscribe member to a community
  // Note: This test assumes a community already exists in the system
  // In a real E2E test environment, this would be set up as a fixture
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId },
      },
    );
  typia.assert(subscription);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: communityId,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Delete the comment (soft delete)
  await api.functional.redditClone.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 6. Attempt to retrieve the deleted comment via profile endpoint
  // This should fail with HTTP 404
  await TestValidator.httpError(
    "deleted comment returns 404",
    404,
    async () =>
      await api.functional.redditClone.profiles.comments.at(memberConnection, {
        profileId: member.id,
        commentId: comment.id,
      }),
  );
}
