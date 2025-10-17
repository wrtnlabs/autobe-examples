import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that an administrator can retrieve appeal details for any community
 * regardless of moderator assignments, demonstrating platform-wide appeal
 * oversight.
 *
 * This test validates administrative cross-community appeal access by creating
 * a multi-community environment with appeals and demonstrating that an
 * administrator can retrieve appeal information. Due to API constraints (no
 * login endpoints available), the test creates all entities in sequence:
 *
 * 1. Create member account for content and appeals
 * 2. Create two communities with the member as creator
 * 3. Create posts in both communities
 * 4. Create moderators (note: actual moderation assignment limited by API)
 * 5. Create moderation actions and appeals
 * 6. Create administrator account
 * 7. Administrator retrieves appeal to validate cross-community access
 */
export async function test_api_appeal_retrieval_cross_community_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create first community
  const community1 = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community1);

  // Step 3: Create second community
  const community2 = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        primary_category: "gaming",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community2);

  // Step 4: Create post in first community
  const post1 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community1.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post1);

  // Step 5: Create post in second community
  const post2 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community2.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post2);

  // Step 6: Create moderator account for reference
  const moderatorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 7: Create moderation action for first post
  const moderationAction1 =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        affected_post_id: post1.id,
        community_id: community1.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "spam",
        reason_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction1);

  // Step 8: Create moderation action for second post
  const moderationAction2 =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        affected_post_id: post2.id,
        community_id: community2.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "inappropriate",
        reason_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction2);

  // Step 9: Create appeal for first moderation action
  const appeal1 =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          moderation_action_id: moderationAction1.id,
          appeal_type: "content_removal",
          appeal_text: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal1);

  // Step 10: Create appeal for second moderation action
  const appeal2 =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          moderation_action_id: moderationAction2.id,
          appeal_type: "content_removal",
          appeal_text: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal2);

  // Step 11: Create administrator account
  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 12: Administrator retrieves appeal from first community
  const retrievedAppeal1 =
    await api.functional.redditLike.admin.moderation.appeals.at(connection, {
      appealId: appeal1.id,
    });
  typia.assert(retrievedAppeal1);

  // Step 13: Validate first appeal details
  TestValidator.equals("appeal ID matches", retrievedAppeal1.id, appeal1.id);
  TestValidator.equals(
    "appeal type is content removal",
    retrievedAppeal1.appeal_type,
    "content_removal",
  );
  TestValidator.equals(
    "appeal status is pending",
    retrievedAppeal1.status,
    "pending",
  );

  // Step 14: Administrator retrieves appeal from second community
  const retrievedAppeal2 =
    await api.functional.redditLike.admin.moderation.appeals.at(connection, {
      appealId: appeal2.id,
    });
  typia.assert(retrievedAppeal2);

  // Step 15: Validate second appeal details
  TestValidator.equals(
    "second appeal ID matches",
    retrievedAppeal2.id,
    appeal2.id,
  );
  TestValidator.equals(
    "second appeal type is content removal",
    retrievedAppeal2.appeal_type,
    "content_removal",
  );
  TestValidator.equals(
    "second appeal status is pending",
    retrievedAppeal2.status,
    "pending",
  );

  // Step 16: Validate cross-community access
  TestValidator.predicate(
    "admin accessed appeals from different communities",
    retrievedAppeal1.id !== retrievedAppeal2.id,
  );
}
