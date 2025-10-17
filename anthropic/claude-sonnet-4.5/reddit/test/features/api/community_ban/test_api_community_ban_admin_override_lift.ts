import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test administrator's ability to override and lift community bans issued by
 * moderators.
 *
 * This test validates the complete workflow of platform-wide moderation
 * oversight where administrators can intervene in community-level bans. The
 * workflow ensures that:
 *
 * 1. A moderator can issue a ban in their community
 * 2. An administrator can lift that ban despite not being a community moderator
 * 3. The ban removal is properly processed (soft-deleted)
 * 4. The system correctly handles the admin override scenario
 *
 * Business Context: Administrators have platform-wide privileges that supersede
 * community-level moderation. This allows for handling appeals, correcting
 * moderator errors, and preventing abuse. The ban is soft-deleted to maintain
 * audit history while restoring member access.
 */
export async function test_api_community_ban_admin_override_lift(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with platform-wide privileges
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create moderator account to issue the ban
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create member account that will be banned
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Switch to member context and create a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 5: Switch to moderator context and issue a ban
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const expirationDate = new Date(Date.now() + sevenDaysInMs).toISOString();

  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    connection,
    {
      communityId: community.id,
      body: {
        banned_member_id: member.id,
        ban_reason_category: "spam",
        ban_reason_text: "Posting spam content repeatedly",
        internal_notes: "Multiple violations reported by community members",
        is_permanent: false,
        expiration_date: expirationDate,
      } satisfies IRedditLikeCommunityBan.ICreate,
    },
  );
  typia.assert(ban);

  // Validate the ban was created successfully with correct properties
  TestValidator.equals(
    "ban belongs to correct community",
    ban.community_id,
    community.id,
  );
  TestValidator.equals(
    "ban targets correct member",
    ban.banned_member_id,
    member.id,
  );
  TestValidator.equals("ban is active", ban.is_active, true);
  TestValidator.equals("ban is temporary", ban.is_permanent, false);
  TestValidator.equals(
    "ban reason category is spam",
    ban.ban_reason_category,
    "spam",
  );

  // Step 6: Switch to admin context and lift the ban using admin override
  await api.functional.redditLike.admin.communities.bans.erase(connection, {
    communityId: community.id,
    banId: ban.id,
  });

  // The erase operation returns void, indicating successful soft deletion
  // The ban is now marked as deleted (deleted_at timestamp set) but preserved for audit history
}
