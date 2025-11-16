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
 * Test filtering ban records by creation date ranges using created_from and
 * created_to parameters.
 *
 * This test validates that moderators can analyze ban patterns over specific
 * time periods by:
 *
 * 1. Creating multiple bans at different timestamps
 * 2. Testing created_from filter (bans on or after timestamp)
 * 3. Testing created_to filter (bans on or before timestamp)
 * 4. Testing combined date range (both parameters together)
 * 5. Verifying ISO 8601 datetime format parsing
 * 6. Confirming bans outside specified ranges are excluded
 */
export async function test_api_community_ban_search_with_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://test.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://test.example.com" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityData = {
    name: RandomGenerator.alphabets(10) satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<21> &
      tags.Pattern<"^[a-z0-9_]+$">,
    display_title: RandomGenerator.name(2) satisfies string &
      tags.MaxLength<100>,
    description: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
      tags.MaxLength<500>,
    rules: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
      tags.MaxLength<500>,
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple guest accounts to be banned
  const guestAccounts: IRedditCommunityGuest.IAuthorized[] =
    await ArrayUtil.asyncRepeat(5, async (index) => {
      const guestData = {
        username: `${RandomGenerator.alphabets(8)}_${index}` satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<50>,
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: "https://test.example.com/guest/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://test.example.com" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate;

      const guest: IRedditCommunityGuest.IAuthorized =
        await api.functional.auth.guest.join(connection, {
          body: guestData,
        });
      typia.assert(guest);
      return guest;
    });

  // Step 4: Create bans with delays to ensure different timestamps
  const createdBans: IRedditCommunityCommunityBan[] = [];

  for (let i = 0; i < guestAccounts.length; i++) {
    const guest = guestAccounts[i];

    // Add small delay to ensure different creation timestamps
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const banData = {
      banned_member_id: guest.id,
      reason:
        `Test ban ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}` satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<500>,
      expires_at: null,
    } satisfies IRedditCommunityCommunityBan.ICreate;

    const ban: IRedditCommunityCommunityBan =
      await api.functional.redditCommunity.moderator.communities.bans.create(
        connection,
        {
          communityName: community.name,
          body: banData,
        },
      );
    typia.assert(ban);
    createdBans.push(ban);
  }

  // Store timestamps for filtering
  const firstBanTime = new Date(createdBans[0].created_at);
  const middleBanTime = new Date(createdBans[2].created_at);
  const lastBanTime = new Date(createdBans[4].created_at);

  // Step 5: Test created_from filter - should return bans on or after the middle timestamp
  const fromMiddleRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    created_from: middleBanTime.toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const fromMiddleResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: fromMiddleRequest,
      },
    );
  typia.assert(fromMiddleResult);

  // Verify all returned bans are on or after the middle timestamp
  TestValidator.predicate(
    "created_from filter returns correct count",
    fromMiddleResult.data.length >= 3,
  );

  for (const ban of fromMiddleResult.data) {
    const banTime = new Date(ban.created_at);
    TestValidator.predicate(
      "ban created_at is on or after created_from",
      banTime >= middleBanTime,
    );
  }

  // Step 6: Test created_to filter - should return bans on or before the middle timestamp
  const toMiddleRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    created_to: middleBanTime.toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const toMiddleResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: toMiddleRequest,
      },
    );
  typia.assert(toMiddleResult);

  // Verify all returned bans are on or before the middle timestamp
  TestValidator.predicate(
    "created_to filter returns correct count",
    toMiddleResult.data.length >= 3,
  );

  for (const ban of toMiddleResult.data) {
    const banTime = new Date(ban.created_at);
    TestValidator.predicate(
      "ban created_at is on or before created_to",
      banTime <= middleBanTime,
    );
  }

  // Step 7: Test combined date range - should return bans in the inclusive range
  const rangeRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    created_from: firstBanTime.toISOString() satisfies string &
      tags.Format<"date-time">,
    created_to: lastBanTime.toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const rangeResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: rangeRequest,
      },
    );
  typia.assert(rangeResult);

  // Verify all bans are within the inclusive range
  TestValidator.predicate(
    "date range filter returns all bans",
    rangeResult.data.length === 5,
  );

  for (const ban of rangeResult.data) {
    const banTime = new Date(ban.created_at);
    TestValidator.predicate(
      "ban is within inclusive date range",
      banTime >= firstBanTime && banTime <= lastBanTime,
    );
  }

  // Step 8: Test narrow range that excludes some bans
  const narrowRangeRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    created_from: new Date(
      createdBans[1].created_at,
    ).toISOString() satisfies string & tags.Format<"date-time">,
    created_to: new Date(
      createdBans[3].created_at,
    ).toISOString() satisfies string & tags.Format<"date-time">,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const narrowResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: narrowRangeRequest,
      },
    );
  typia.assert(narrowResult);

  // Verify bans outside the narrow range are excluded
  const narrowFrom = new Date(createdBans[1].created_at);
  const narrowTo = new Date(createdBans[3].created_at);

  for (const ban of narrowResult.data) {
    const banTime = new Date(ban.created_at);
    TestValidator.predicate(
      "ban is within narrow range",
      banTime >= narrowFrom && banTime <= narrowTo,
    );
  }

  // Verify first and last bans are not in narrow results
  const narrowBanIds = narrowResult.data.map((b) => b.id);
  TestValidator.predicate(
    "first ban excluded from narrow range",
    !narrowBanIds.includes(createdBans[0].id),
  );
  TestValidator.predicate(
    "last ban excluded from narrow range",
    !narrowBanIds.includes(createdBans[4].id),
  );
}
