import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
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
import { generate_random_reddit_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_community_member_communities_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test comment creation rejection for banned community members.
 *
 * Validates that a member who has been banned from a community cannot create comments on posts within that community. The test establishes a complete community scenario with an owner, a regular member, and a post, then bans the member and verifies that comment creation attempts are properly rejected.
 *
 * The test flow ensures proper access control by verifying that the ban enforcement occurs at the comment creation endpoint. This protects community integrity by preventing banned users from participating in discussions while maintaining their ability to view content.
 *
 * 1. Community owner account is created and authenticated.
 * 2. Community is created by the owner.
 * 3. Commenter member account is created and authenticated.
 * 4. Commenter subscribes to the community.
 * 5. A text post is created in the community by the commenter.
 * 6. Community owner bans the commenter from the community.
 * 7. Banned member attempts to create a comment and receives 403 Forbidden.
 */
export async function test_api_comment_creation_banned_member_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community (as owner)
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create and authenticate commenter member
  const commenterConnection: api.IConnection = { host: connection.host };
  const commenterAuth = await authorize_member_join(commenterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(commenterAuth);
  // 4. Subscribe commenter to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      commenterConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Create a post in the community (as commenter)
  const post = await generate_random_reddit_community_posts_create(
    commenterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Ban the commenter from the community (as owner)
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        body: {
          reddit_community_member_id: commenterAuth.id,
          reason: "Violation of community rules",
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(ban);
  // 7. Attempt to create a comment as banned member - should be rejected
  await TestValidator.error(
    "banned member comment creation rejected",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.create(
        commenterConnection,
        {
          postId: post.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditCommunityComment.ICreate,
        },
      );
    },
  );
}
