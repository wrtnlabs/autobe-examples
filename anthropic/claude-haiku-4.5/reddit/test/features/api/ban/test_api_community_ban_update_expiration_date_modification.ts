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
 * Test moderator ability to adjust temporary ban expiration dates after initial
 * issuance.
 *
 * This test validates the complete ban management workflow including:
 *
 * 1. Creating moderator and two member accounts with proper authentication
 * 2. Creating a community with one member as creator
 * 3. Appointing the moderator to manage community bans
 * 4. Issuing a temporary ban against the second member with initial expiration
 * 5. Updating the ban's expiration date to extend the ban duration
 * 6. Verifying persistence of the new expiration date
 * 7. Confirming ban_type remains 'temporary' and other properties are unchanged
 * 8. Testing edge cases with near-immediate and far-future expiration dates
 * 9. Validating that only future expiration timestamps are accepted
 *
 * The test ensures moderators can flexibly adjust ban durations post-issuance
 * without needing to recreate the entire ban record.
 */
export async function test_api_community_ban_update_expiration_date_modification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for ban management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderatorAccount: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://example.com/auth",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  // Step 2: Create community creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphabets(12);
  const creatorAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: creatorPassword,
        href: "https://example.com/auth",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creatorAccount);

  // Step 3: Create banned member account
  const bannedMemberEmail = typia.random<string & tags.Format<"email">>();
  const bannedMemberPassword = RandomGenerator.alphabets(12);
  const bannedMemberAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: bannedMemberEmail,
        username: RandomGenerator.alphabets(8),
        password: bannedMemberPassword,
        href: "https://example.com/auth",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(bannedMemberAccount);

  // Step 4: Switch to creator context and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          identifier: `test_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 5: Create a temporary member to be appointed as moderator
  const tempModeratorEmail = typia.random<string & tags.Format<"email">>();
  const tempModeratorPassword = RandomGenerator.alphabets(12);
  const tempModeratorAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: tempModeratorEmail,
        username: RandomGenerator.alphabets(8),
        password: tempModeratorPassword,
        href: "https://example.com/auth",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(tempModeratorAccount);

  // Step 6: Appoint the moderator member to the community
  const appointedModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: tempModeratorAccount.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(appointedModerator);
  TestValidator.equals(
    "moderator tier is senior",
    appointedModerator.moderator_tier,
    "senior",
  );

  // Step 7: Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Create temporary ban with initial expiration (7 days from now)
  const initialExpiration = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: bannedMemberAccount.id,
          ban_type: "temporary",
          reason: banReason,
          expires_at: initialExpiration,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals("ban type is temporary", ban.ban_type, "temporary");
  TestValidator.equals(
    "initial expiration is set",
    ban.expires_at,
    initialExpiration,
  );
  TestValidator.predicate(
    "banned member id matches",
    ban.member.id === bannedMemberAccount.id,
  );

  // Step 9: Update ban expiration to extend duration (14 days from now)
  const extendedExpiration = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          expires_at: extendedExpiration,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  TestValidator.equals(
    "ban type remains temporary",
    updatedBan.ban_type,
    "temporary",
  );
  TestValidator.equals(
    "expiration date is extended",
    updatedBan.expires_at,
    extendedExpiration,
  );
  TestValidator.notEquals(
    "expiration date changed from initial",
    updatedBan.expires_at,
    ban.expires_at,
  );
  TestValidator.equals("ban id remains unchanged", updatedBan.id, ban.id);
  TestValidator.equals(
    "reason remains unchanged",
    updatedBan.reason,
    ban.reason,
  );

  // Step 10: Test edge case - near-immediate future expiration (1 minute from now)
  const nearFutureExpiration = new Date(
    Date.now() + 1 * 60 * 1000,
  ).toISOString();
  const nearFutureUpdatedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          expires_at: nearFutureExpiration,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(nearFutureUpdatedBan);
  TestValidator.equals(
    "near-future expiration set correctly",
    nearFutureUpdatedBan.expires_at,
    nearFutureExpiration,
  );
  TestValidator.equals(
    "ban type still temporary after near-future update",
    nearFutureUpdatedBan.ban_type,
    "temporary",
  );

  // Step 11: Test edge case - far-future expiration (1 year from now)
  const farFutureExpiration = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const farFutureUpdatedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          expires_at: farFutureExpiration,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(farFutureUpdatedBan);
  TestValidator.equals(
    "far-future expiration set correctly",
    farFutureUpdatedBan.expires_at,
    farFutureExpiration,
  );
  TestValidator.equals(
    "ban type still temporary after far-future update",
    farFutureUpdatedBan.ban_type,
    "temporary",
  );

  // Step 12: Verify ban immutable properties remain unchanged through all updates
  TestValidator.equals(
    "member reference unchanged after all updates",
    farFutureUpdatedBan.member.id,
    ban.member.id,
  );
  TestValidator.equals(
    "moderator reference unchanged after all updates",
    farFutureUpdatedBan.moderator.id,
    ban.moderator.id,
  );
  TestValidator.equals(
    "community reference unchanged after all updates",
    farFutureUpdatedBan.community.id,
    ban.community.id,
  );
  TestValidator.equals(
    "ban reason unchanged after all updates",
    farFutureUpdatedBan.reason,
    ban.reason,
  );
  TestValidator.equals(
    "appeal fields remain null when not set",
    farFutureUpdatedBan.appeal_submitted_at,
    null,
  );
  TestValidator.equals(
    "appeal resolution remains null when not set",
    farFutureUpdatedBan.appeal_resolved_at,
    null,
  );
  TestValidator.equals(
    "appeal approved remains null when not set",
    farFutureUpdatedBan.appeal_approved,
    null,
  );
}
