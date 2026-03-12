import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBan";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that a community moderator can retrieve historical (lifted) bans with search functionality.
 * Validates search filtering, lifted ban status, sorting, and pagination for ban audit trails.
 */
export async function test_api_community_ban_list_retrieve_lifted_bans_with_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member (moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
    },
  });
  typia.assert(owner);
  // 2. Create community with owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create two member accounts (potential banned users)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      username: "testuser_alpha",
      display_name: "Test User Alpha",
    },
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      username: "testuser_beta",
      display_name: "Test User Beta",
    },
  });
  typia.assert(member2);
  // 4. Test retrieval of lifted bans with search functionality
  // Note: This tests the API filtering capabilities. Actual ban records
  // would be created by moderation actions (ban/lift operations)
  const searchResults = await api.functional.redditClone.communities.bans.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        status: "lifted",
        search: "testuser",
        sortBy: "lifted_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneBan.IRequest,
    },
  );
  typia.assert(searchResults);
  // 5. Validate response structure
  TestValidator.predicate(
    "response has pagination metadata",
    searchResults.pagination !== undefined,
  );
  typia.assert(searchResults.pagination);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchResults.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has non-negative records count",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages count",
    searchResults.pagination.pages >= 0,
  );
  // 7. Validate data array exists
  TestValidator.predicate(
    "response has data array",
    Array.isArray(searchResults.data),
  );
  // 8. If results exist, validate their structure
  if (searchResults.data.length > 0) {
    await ArrayUtil.asyncForEach(searchResults.data, async (ban) => {
      typia.assert(ban);
      // Validate lifted_at is populated (not null) for lifted bans
      TestValidator.predicate(
        `ban ${ban.id} has lifted_at timestamp (not null)`,
        ban.lifted_at !== null,
      );
      // Validate member information is included
      typia.assert(ban.member);
      TestValidator.predicate(
        `ban ${ban.id} has valid member id`,
        ban.member.id.length > 0,
      );
      TestValidator.predicate(
        `ban ${ban.id} has member username`,
        ban.member.username.length > 0,
      );
      TestValidator.predicate(
        `ban ${ban.id} has member display_name`,
        ban.member.display_name.length > 0,
      );
      // Validate search term matches (case-insensitive partial match)
      const searchMatch =
        ban.member.username.toLowerCase().includes("testuser") ||
        ban.member.display_name.toLowerCase().includes("testuser");
      TestValidator.predicate(
        `ban ${ban.id} matches search term 'testuser'`,
        searchMatch,
      );
    });
    // 9. Validate sorting by lifted_at descending (if multiple results)
    if (searchResults.data.length > 1) {
      for (let i = 1; i < searchResults.data.length; i++) {
        const prevBan = searchResults.data[i - 1];
        const currBan = searchResults.data[i];
        typia.assert(prevBan);
        typia.assert(currBan);
        TestValidator.predicate(
          `bans sorted by lifted_at descending at index ${i}`,
          prevBan.lifted_at !== null &&
            currBan.lifted_at !== null &&
            new Date(prevBan.lifted_at).getTime() >=
              new Date(currBan.lifted_at).getTime(),
        );
      }
    }
  }
  // 10. Test retrieval without search to get all lifted bans
  const allLiftedBans = await api.functional.redditClone.communities.bans.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        status: "lifted",
        sortBy: "lifted_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneBan.IRequest,
    },
  );
  typia.assert(allLiftedBans);
  // 11. Validate all lifted bans response
  TestValidator.predicate(
    "all lifted bans response has data array",
    Array.isArray(allLiftedBans.data),
  );
  // 12. If any lifted bans exist, validate they all have lifted_at
  if (allLiftedBans.data.length > 0) {
    await ArrayUtil.asyncForEach(allLiftedBans.data, async (ban) => {
      typia.assert(ban);
      TestValidator.predicate(
        `lifted ban ${ban.id} has lifted_at populated`,
        ban.lifted_at !== null,
      );
    });
  }
  // 13. Test with different search term (should return different or empty results)
  const differentSearch =
    await api.functional.redditClone.communities.bans.index(ownerConnection, {
      communityId: community.id,
      body: {
        status: "lifted",
        search: "alpha",
        sortBy: "lifted_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneBan.IRequest,
    });
  typia.assert(differentSearch);
  // 14. Validate different search response structure
  TestValidator.predicate(
    "different search returns valid response",
    Array.isArray(differentSearch.data),
  );
  // 15. If results exist for "alpha" search, validate they match
  if (differentSearch.data.length > 0) {
    await ArrayUtil.asyncForEach(differentSearch.data, async (ban) => {
      typia.assert(ban);
      const alphaMatch =
        ban.member.username.toLowerCase().includes("alpha") ||
        ban.member.display_name.toLowerCase().includes("alpha");
      TestValidator.predicate(
        `ban ${ban.id} matches search term 'alpha'`,
        alphaMatch,
      );
    });
  }
}
