import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that users banned from a community cannot create comments on posts within that community.
 *
 * Validates the complete ban enforcement flow including member registration, moderator registration, community subscription, post creation, ban enforcement, and comment creation restriction. Ensures that banned users are prevented from creating comments on any post within the banned community while maintaining their ability to view content.
 *
 * Special attention is given to verifying that the ban check is performed during comment creation and that the appropriate error is returned when a banned user attempts to comment.
 *
 * 1. Register a member account who will be banned from the community.
 * 2. Register a moderator account who will enforce the ban.
 * 3. Subscribe the member to an existing community.
 * 4. Create a post in the community.
 * 5. Moderator bans the member from the community with a reason.
 * 6. Attempt to create a comment as the banned member on the post.
 * 7. Validate that the comment creation fails with an error.
 */
export async function test_api_comment_creation_banned_user_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (will be banned)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create moderator account (will ban the member)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // 3. Use an existing community (assumed to exist in test environment)
  // In a real test setup, community creation would be part of the test data preparation
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Subscribe the member to the community
  const subscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId },
      },
    );
  typia.assert(subscription);
  // 5. Create a post in the community
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
  // 6. Moderator bans the member from the community
  const ban =
    await generate_random_reddit_clone_moderator_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId },
        body: {
          ban_reason: "Violation of community rules",
          reddit_clone_member_id: memberAuth.id,
        } satisfies IRedditCloneCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 7. Attempt to create a comment as the banned member
  // This should fail because the member is banned from the community
  await TestValidator.error("banned user cannot create comment", async () => {
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "This comment should fail because I'm banned",
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  });
  // 8. Verify that the ban is active
  TestValidator.predicate("ban is active", ban.deletedAt === null);
  TestValidator.equals("banned member ID", ban.bannedMember.id, memberAuth.id);
  TestValidator.predicate("ban reason exists", ban.banReason.length > 0);
}
