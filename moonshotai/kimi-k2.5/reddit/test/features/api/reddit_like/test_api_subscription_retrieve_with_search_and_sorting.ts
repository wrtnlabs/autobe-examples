import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test filtering and sorting capabilities of the subscribed communities endpoint.
 *
 * First authenticate as a member, create multiple communities with distinct names,
 * subscribe to all of them, then search for communities by partial name match and
 * verify only matching results are returned. Test sorting by both subscription date
 * (created_at) and community name in ascending and descending order. Validate that
 * search is case-insensitive and performs partial matching on community names.
 */
export async function test_api_subscription_retrieve_with_search_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create multiple communities with distinct names for search testing
  const communityDefs = [
    { name: "AlphabetLearning" },
    { name: "AlpineHikingClub" },
    { name: "BananaRecipes" },
    { name: "CherryPicking" },
  ] as const;
  const communities = await ArrayUtil.asyncMap(communityDefs, async (item) => {
    return await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: item.name,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  });
  // 3. Test search with case-insensitive partial matching (search for "alp")
  const searchResults =
    await api.functional.redditLike.member.subscribed_communities.index(
      memberConnection,
      {
        body: {
          search: "alp",
          limit: 100,
        } satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate search returns exactly the matching communities with partial names
  TestValidator.equals(
    "search returns 2 communities with 'alp' in name",
    searchResults.data.length,
    2,
  );
  TestValidator.predicate(
    "all search results have community names containing 'alp' (case-insensitive)",
    () =>
      searchResults.data.every((s) =>
        s.community.name.toLowerCase().includes("alp"),
      ),
  );
  TestValidator.equals(
    "search returns expected community names",
    searchResults.data.map((s) => s.community.name).sort(),
    ["AlphabetLearning", "AlpineHikingClub"].sort(),
  );
  // 4. Test sorting by subscription date (created_at) ascending (+created_at)
  const ascByDate =
    await api.functional.redditLike.member.subscribed_communities.index(
      memberConnection,
      {
        body: {
          sort: "+created_at",
          limit: 100,
        } satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(ascByDate);
  // 5. Test sorting by subscription date (created_at) descending (-created_at)
  const descByDate =
    await api.functional.redditLike.member.subscribed_communities.index(
      memberConnection,
      {
        body: {
          sort: "-created_at",
          limit: 100,
        } satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(descByDate);
  // Validate ascending and descending date sorts are reverses of each other
  TestValidator.equals(
    "ascending and descending date sorts are reversed",
    ascByDate.data.map((s) => s.id).reverse(),
    descByDate.data.map((s) => s.id),
  );
  // 6. Test sorting by community name ascending (+name)
  const ascByName =
    await api.functional.redditLike.member.subscribed_communities.index(
      memberConnection,
      {
        body: {
          sort: "+name",
          limit: 100,
        } satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(ascByName);
  // Validate alphabetical ascending order
  const namesAsc = ascByName.data.map((s) => s.community.name);
  TestValidator.equals(
    "ascending sort by name returns alphabetized results",
    namesAsc,
    [...namesAsc].sort(),
  );
  // 7. Test sorting by community name descending (-name)
  const descByName =
    await api.functional.redditLike.member.subscribed_communities.index(
      memberConnection,
      {
        body: {
          sort: "-name",
          limit: 100,
        } satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(descByName);
  // Validate name descending is reverse of ascending (alphabetical reverse)
  TestValidator.equals(
    "ascending and descending name sorts are reversed",
    namesAsc.reverse(),
    descByName.data.map((s) => s.community.name),
  );
}
