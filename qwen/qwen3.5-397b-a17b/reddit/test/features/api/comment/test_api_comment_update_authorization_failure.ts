import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test that a member cannot update another member's comment.
 *
 * Validates the authorization mechanism that prevents unauthorized comment modification. The test establishes a complete scenario where Member A creates a comment on their own post, then Member B (a different authenticated user) attempts to update that comment. The system must reject this attempt with a 403 Forbidden error, ensuring that only comment authors can modify their own content.
 *
 * This test verifies the core security principle that content ownership is enforced at the API level. The authorization check must validate that the authenticated member's ID matches the comment's author ID before allowing any modification. This prevents malicious users from altering other users' content, which is critical for maintaining content integrity and user trust in the platform.
 *
 * 1. Member A registers with unique credentials and authenticates.
 * 2. Member A creates a community to host the post.
 * 3. Member A subscribes to their community for posting privileges.
 * 4. Member A creates a text post in the community.
 * 5. Member A creates a comment on their own post.
 * 6. Member B registers with different credentials and authenticates.
 * 7. Member B attempts to update Member A's comment - must fail with 403.
 * 8. Validates that the error response indicates authorization failure.
 */
export async function test_api_comment_update_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to their community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Member A creates a post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member A creates a comment on the post
  const originalContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          content: originalContent,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Member B registers and authenticates (different user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberB);
  // 7. Member B attempts to update Member A's comment - should fail with 403
  const newContent = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.error("unauthorized comment update", async () => {
    await api.functional.redditCommunity.member.posts.comments.update(
      memberBConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: newContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  });
  // 8. Verify Member A can still update their own comment (authorization works correctly)
  const updatedComment =
    await api.functional.redditCommunity.member.posts.comments.update(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: newContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  TestValidator.equals(
    "content updated by author",
    updatedComment.content,
    newContent,
  );
}
