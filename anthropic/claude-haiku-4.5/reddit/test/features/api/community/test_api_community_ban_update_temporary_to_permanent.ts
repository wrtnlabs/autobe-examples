import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator escalation of a temporary community ban to permanent status.
 *
 * This test validates the complete workflow of creating accounts, establishing
 * community structure, issuing a temporary ban, and then escalating it to
 * permanent status. It ensures that ban records are properly updated and that
 * all fields reflect the correct state transitions.
 *
 * Test flow:
 *
 * 1. Create moderator account via /auth/moderator/join
 * 2. Create member account (community creator) via /auth/member/join
 * 3. Create community via /communityPlatform/member/communities
 * 4. Appoint moderator to community via
 *    /communityPlatform/member/communities/{communityId}/moderators
 * 5. Create another member account (to be banned) via /auth/member/join
 * 6. Issue temporary ban via
 *    /communityPlatform/moderator/communities/{communityId}/bans
 * 7. Update ban to permanent via
 *    /communityPlatform/moderator/communities/{communityId}/bans/{banId}
 * 8. Validate the updated ban record
 */
export async function test_api_community_ban_update_temporary_to_permanent(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(1),
      password: "ModeratorPassword123!",
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== null,
  );

  // Step 2: Create community creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.name(1),
      password: "CreatorPassword123!",
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);
  TestValidator.predicate(
    "community creator member created",
    creator.id !== null,
  );

  // Step 3: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== null,
  );

  // Step 4: Switch to moderator account and appoint to community
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Switch back to creator to appoint moderator
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "CreatorPassword123!",
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: moderator.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator);
  TestValidator.equals(
    "moderator tier is senior",
    communityModerator.moderator_tier,
    "senior",
  );

  // Step 5: Create another member to ban
  const bannedMemberEmail = typia.random<string & tags.Format<"email">>();
  const bannedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: bannedMemberEmail,
      username: RandomGenerator.name(1),
      password: "BannedMemberPassword123!",
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(bannedMember);
  TestValidator.predicate("banned member created", bannedMember.id !== null);

  // Step 6: Switch to moderator account and issue temporary ban
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create expiration date 30 days in the future
  const now = new Date();
  const expirationDate = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const temporaryBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: bannedMember.id,
          ban_type: "temporary",
          reason:
            "Repeated violation of Rule 5: Be respectful - multiple instances of disrespectful comments",
          expires_at: expirationDate,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(temporaryBan);
  TestValidator.equals(
    "initial ban type is temporary",
    temporaryBan.ban_type,
    "temporary",
  );
  TestValidator.predicate(
    "initial ban has expiration date",
    temporaryBan.expires_at !== null,
  );

  // Step 7: Update ban to permanent status
  const permanentBan =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      connection,
      {
        communityId: community.id,
        banId: temporaryBan.id,
        body: {
          ban_type: "permanent",
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(permanentBan);

  // Step 8: Validate the updated ban record
  TestValidator.equals(
    "ban type changed to permanent",
    permanentBan.ban_type,
    "permanent",
  );
  TestValidator.equals(
    "expires_at is null for permanent ban",
    permanentBan.expires_at,
    null,
  );
  TestValidator.equals("ban ID remains same", permanentBan.id, temporaryBan.id);
  TestValidator.predicate(
    "member reference preserved",
    permanentBan.member.id === bannedMember.id,
  );
  TestValidator.predicate(
    "community reference preserved",
    permanentBan.community.id === community.id,
  );
}
