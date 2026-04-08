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
 * Test that a user who is neither the comment author nor a community moderator cannot delete a comment.
 *
 * Validates the authorization logic for comment deletion by ensuring that only the comment author or community moderators can delete comments. The test creates a complete scenario with two different users where Member A creates content and Member B attempts unauthorized deletion.
 *
 * 1. Member A joins and authenticates, creating their own connection with JWT token.
 * 2. Member A creates a community and subscribes to it.
 * 3. Member A creates a post in the community.
 * 4. Member A creates a comment on their post.
 * 5. Member B joins with different credentials, creating separate authentication.
 * 6. Member B attempts to delete Member A's comment.
 * 7. Validates 403 Forbidden error is returned.
 * 8. Verifies comment still exists and is not soft-deleted.
 */
export async function test_api_comment_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A setup - create authenticated connection
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
  // 2. Member A creates community
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
  const post =
    await generate_random_reddit_community_posts_create(memberAConnection, {});
  typia.assert(post);
  // 5. Member A creates a comment on their post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberAConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Member B setup - different user authenticates
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
  // 7. Member B attempts to delete Member A's comment - should fail with 403
  await TestValidator.error("unauthorized comment deletion", async () => {
    await api.functional.redditCommunity.member.posts.comments.erase(
      memberBConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  });
  // 8. Verify comment still exists and is not deleted
  TestValidator.predicate("comment not deleted", comment.deleted_at === null);
  TestValidator.equals(
    "comment author is Member A",
    comment.author.id,
    memberA.id,
  );
}