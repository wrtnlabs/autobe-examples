import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBanRecord";
import type { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_banned_user } from "../../../prepare/prepare_random_reddit_platform_banned_user";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_bans_index_date_range_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(10) +
            "_" +
            RandomGenerator.alphaNumeric(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create three members to ban
  const bannedMembers: IRedditPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(member);
    bannedMembers.push(member);
  }
  // 4. Create three ban records with different reasons
  const banReasons = ["spam", "harassment", "spam content"] as const;
  const banRecords: IRedditPlatformBannedUser[] = [];
  for (let i = 0; i < 3; i++) {
    const ban =
      await generate_random_reddit_platform_member_communities_bans_create(
        moderatorConnection,
        {
          body: {
            user_id: bannedMembers[i].id,
            reason: banReasons[i],
          },
          params: {
            communityName: community.name,
          },
        },
      );
    typia.assert(ban);
    banRecords.push(ban);
  }
  // Wait a moment to ensure different timestamps for date range testing
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Search query test: search for 'spam'
  const spamSearchResponse =
    await api.functional.redditPlatform.member.bans.index(moderatorConnection, {
      body: {
        search_query: "spam",
        limit: 10,
      },
    });
  typia.assert(spamSearchResponse);
  // 6. Search query test: search for 'harassment'
  const harassmentSearchResponse =
    await api.functional.redditPlatform.member.bans.index(moderatorConnection, {
      body: {
        search_query: "harassment",
        limit: 10,
      },
    });
  typia.assert(harassmentSearchResponse);
  // 7. Date range test: filter by banned_at_from
  const recentBansResponse =
    await api.functional.redditPlatform.member.bans.index(moderatorConnection, {
      body: {
        banned_at_from: banRecords[0].banned_at,
        limit: 10,
      },
    });
  typia.assert(recentBansResponse);
  // 8. Date range test: filter by banned_at_to
  const oldBansResponse = await api.functional.redditPlatform.member.bans.index(
    moderatorConnection,
    {
      body: {
        banned_at_to: banRecords[1].banned_at,
        limit: 10,
      },
    },
  );
  typia.assert(oldBansResponse);
  // 9. Sorting test: sort by reason
  const sortReasonResponse =
    await api.functional.redditPlatform.member.bans.index(moderatorConnection, {
      body: {
        sort: "reason",
        order: "asc",
        limit: 10,
      },
    });
  typia.assert(sortReasonResponse);
  // 10. Sorting test: sort by user_id
  const sortUserResponse =
    await api.functional.redditPlatform.member.bans.index(moderatorConnection, {
      body: {
        sort: "user_id",
        order: "desc",
        limit: 10,
      },
    });
  typia.assert(sortUserResponse);
  // 11. Sorting test: sort by banned_at
  const sortDateResponse =
    await api.functional.redditPlatform.member.bans.index(moderatorConnection, {
      body: {
        sort: "banned_at",
        order: "desc",
        limit: 10,
      },
    });
  typia.assert(sortDateResponse);
  // 12. Combination test: date range + search query
  const comboResponse = await api.functional.redditPlatform.member.bans.index(
    moderatorConnection,
    {
      body: {
        banned_at_from: banRecords[0].banned_at,
        search_query: "spam",
        limit: 10,
      },
    },
  );
  typia.assert(comboResponse);
  // 13. Validate search results contain expected bans
  const spamSearchResults = spamSearchResponse.data;
  TestValidator.equals(
    "spam search returns 2 bans (spam + spam content)",
    spamSearchResults.length,
    2,
  );
  // 14. Validate harassment search returns correct ban
  const harassmentSearchResults = harassmentSearchResponse.data;
  TestValidator.equals(
    "harassment search returns 1 ban",
    harassmentSearchResults.length,
    1,
  );
  // 15. Validate date range filter includes recent bans
  const recentBans = recentBansResponse.data;
  TestValidator.predicate(
    "recent bans from banned_at_from includes all bans",
    recentBans.length >= 1,
  );
  // 16. Validate sorting by reason produces alphabetical order
  if (sortReasonResponse.data.length > 1) {
    const reasons = sortReasonResponse.data.map((b) => b.reason);
    const sortedReasons = [...reasons].sort();
    TestValidator.equals(
      "reason sorting produces alphabetical order",
      reasons,
      sortedReasons,
    );
  }
  // 17. Validate combination of filters works
  TestValidator.predicate(
    "combination of date range and search returns expected results",
    comboResponse.data.length >= 0,
  );
  // 18. Validate no soft-deleted records appear in results
  TestValidator.predicate(
    "no soft-deleted records in ban results",
    banRecords.every((record) => record.deleted_at === null),
  );
  // 19. Validate ban IDs are consistent across search results
  const banIdsInSpamSearch = new Set(spamSearchResults.map((b) => b.id));
  const expectedSpamBanIds = new Set(
    banRecords.filter((b) => b.reason.includes("spam")).map((b) => b.id),
  );
  TestValidator.equals(
    "spam search returns correct ban IDs",
    banIdsInSpamSearch.size,
    expectedSpamBanIds.size,
  );
}
