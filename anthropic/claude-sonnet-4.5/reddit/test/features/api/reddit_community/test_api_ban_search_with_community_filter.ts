import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test searching and filtering community bans by specific community name.
 *
 * This test validates the community-scoped ban search functionality, ensuring
 * that moderators can efficiently retrieve bans filtered by a specific
 * community name.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create multiple test communities to establish a multi-community environment
 * 3. Search for bans filtering by a specific community name
 * 4. Validate that the paginated response structure is correct
 * 5. Verify pagination metadata reflects the filtered result set accurately
 * 6. Ensure the API correctly applies the community_name filter parameter
 *
 * This test ensures community-scoped ban management works correctly for
 * moderators reviewing bans within their assigned communities.
 */
export async function test_api_ban_search_with_community_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create multiple communities for testing cross-community filtering
  const communities: IRedditCommunityCommunity[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const randomSuffix = typia.random<number & tags.Type<"uint32">>();
      const community: IRedditCommunityCommunity =
        await api.functional.redditCommunity.moderator.communities.create(
          connection,
          {
            body: {
              name: `testcomm${randomSuffix}`.substring(0, 21),
              display_title: RandomGenerator.paragraph({ sentences: 2 }),
              description: RandomGenerator.paragraph({ sentences: 5 }),
              rules: RandomGenerator.paragraph({ sentences: 3 }),
            } satisfies IRedditCommunityCommunity.ICreate,
          },
        );
      typia.assert(community);
      return community;
    },
  );

  // Step 3: Select a target community for filtering
  const targetCommunity = RandomGenerator.pick(communities);

  // Step 4: Search for bans filtered by the target community name
  const searchResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        community_name: targetCommunity.name,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(searchResult);

  // Step 5: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is valid",
    searchResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is valid",
    searchResult.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination records count is non-negative",
    searchResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Step 6: If there are bans in the result, validate they all belong to the target community
  if (searchResult.data.length > 0) {
    await ArrayUtil.asyncForEach(searchResult.data, async (ban) => {
      typia.assert(ban);

      TestValidator.equals(
        "ban belongs to target community",
        ban.community.name,
        targetCommunity.name,
      );
    });
  }

  // Step 7: Validate pagination metadata consistency
  TestValidator.predicate(
    "data array length matches expected page size",
    searchResult.data.length <= searchResult.pagination.limit,
  );

  TestValidator.predicate(
    "pagination pages calculation is correct",
    searchResult.pagination.pages ===
      Math.ceil(
        searchResult.pagination.records / searchResult.pagination.limit,
      ) ||
      (searchResult.pagination.records === 0 &&
        searchResult.pagination.pages === 0),
  );
}
