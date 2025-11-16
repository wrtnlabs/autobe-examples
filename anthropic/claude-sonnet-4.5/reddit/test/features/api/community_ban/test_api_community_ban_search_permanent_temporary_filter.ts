import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test filtering ban records by permanence using the is_permanent parameter.
 *
 * This test validates that moderators can distinguish between permanent and
 * temporary enforcement actions by using the is_permanent search filter. The
 * test creates both permanent bans (without expiration dates) and temporary
 * bans (with defined expiration dates), then verifies that:
 *
 * 1. Setting is_permanent=true returns only bans with null expires_at
 * 2. Setting is_permanent=false returns only bans with defined expiration dates
 * 3. The filter accurately reflects the ban duration type
 * 4. Each category can be browsed separately for different moderation workflows
 * 5. The response correctly identifies the ban type through both is_permanent flag
 *    and expires_at field
 *
 * This supports differentiated moderation strategies for various violation
 * severities.
 */
export async function test_api_community_ban_search_permanent_temporary_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://test.example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a test community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10) satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<21> &
            tags.Pattern<"^[a-z0-9_]+$">,
          display_title: RandomGenerator.name(3) satisfies string &
            tags.MaxLength<100>,
          description: RandomGenerator.paragraph({
            sentences: 5,
          }) satisfies string & tags.MaxLength<500>,
          rules: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
            tags.MaxLength<500>,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple guest member accounts to ban
  const guestCount = 6;
  const guests = await ArrayUtil.asyncRepeat(guestCount, async () => {
    const guest = await api.functional.auth.guest.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<50>,
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        ip: "127.0.0.1",
        href: "https://test.example.com/guest" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
    typia.assert(guest);
    return guest;
  });

  // Step 4: Create permanent bans (first 3 guests)
  const permanentBans = await ArrayUtil.asyncRepeat(3, async (index) => {
    const ban =
      await api.functional.redditCommunity.moderator.communities.bans.create(
        connection,
        {
          communityName: community.name,
          body: {
            banned_member_id: guests[index].id,
            reason:
              `Permanent ban for severe violation ${index + 1}` satisfies string &
                tags.MinLength<1> &
                tags.MaxLength<500>,
            expires_at: null,
          } satisfies IRedditCommunityCommunityBan.ICreate,
        },
      );
    typia.assert(ban);
    return ban;
  });

  // Step 5: Create temporary bans (last 3 guests)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  const temporaryBans = await ArrayUtil.asyncRepeat(3, async (index) => {
    const expirationDate = new Date(futureDate);
    expirationDate.setDate(expirationDate.getDate() + index);

    const ban =
      await api.functional.redditCommunity.moderator.communities.bans.create(
        connection,
        {
          communityName: community.name,
          body: {
            banned_member_id: guests[index + 3].id,
            reason:
              `Temporary ban for minor violation ${index + 1}` satisfies string &
                tags.MinLength<1> &
                tags.MaxLength<500>,
            expires_at: expirationDate.toISOString() satisfies string &
              tags.Format<"date-time">,
          } satisfies IRedditCommunityCommunityBan.ICreate,
        },
      );
    typia.assert(ban);
    return ban;
  });

  // Step 6: Search for permanent bans (is_permanent=true)
  const permanentSearchResult =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          is_permanent: true,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(permanentSearchResult);

  // Validate permanent bans search results
  TestValidator.equals(
    "permanent bans count should match created permanent bans",
    permanentSearchResult.data.length,
    3,
  );

  // Verify all returned bans are permanent
  permanentSearchResult.data.forEach((ban) => {
    TestValidator.equals(
      "is_permanent flag should be true for permanent bans",
      ban.is_permanent,
      true,
    );
    TestValidator.equals(
      "expires_at should be null for permanent bans",
      ban.expires_at,
      null,
    );
  });

  // Step 7: Search for temporary bans (is_permanent=false)
  const temporarySearchResult =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          is_permanent: false,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(temporarySearchResult);

  // Validate temporary bans search results
  TestValidator.equals(
    "temporary bans count should match created temporary bans",
    temporarySearchResult.data.length,
    3,
  );

  // Verify all returned bans are temporary
  temporarySearchResult.data.forEach((ban) => {
    TestValidator.equals(
      "is_permanent flag should be false for temporary bans",
      ban.is_permanent,
      false,
    );
    TestValidator.predicate(
      "expires_at should be defined for temporary bans",
      ban.expires_at !== null && ban.expires_at !== undefined,
    );
  });

  // Step 8: Verify segregation - no overlap between permanent and temporary results
  const permanentBanIds = permanentSearchResult.data.map((b) => b.id);
  const temporaryBanIds = temporarySearchResult.data.map((b) => b.id);

  temporaryBanIds.forEach((tempId) => {
    TestValidator.predicate(
      "temporary ban IDs should not appear in permanent ban results",
      !permanentBanIds.includes(tempId),
    );
  });

  permanentBanIds.forEach((permId) => {
    TestValidator.predicate(
      "permanent ban IDs should not appear in temporary ban results",
      !temporaryBanIds.includes(permId),
    );
  });
}
