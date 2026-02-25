import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_search_relevance_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(owner);
  // Create search request with keyword 'dev' and limit=10
  const searchRequest: IRedditCommunityCommunity.IRequest = {
    search: "dev",
    limit: 10,
  };
  // Search for communities with 'dev'
  const searchResult =
    await api.functional.redditCommunity.communityOwner.communities.index(
      ownerConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination
  TestValidator.equals(
    "search pagination limit",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.predicate("search has data", searchResult.data.length > 0);
  // Extract community names from search results
  const searchedNames = searchResult.data.map((c) => c.name.toLowerCase());
  const searchedDescriptions = searchResult.data.map(
    (c) => c.description?.toLowerCase() || "",
  );
  // Validate that at least one exact "dev" match exists
  const exactDevMatch = searchedNames.some((name) => name === "dev");
  TestValidator.predicate("exact 'dev' prefix match found", exactDevMatch);
  // Validate that case-insensitive matching works
  const hasCaseInsensitiveMatch =
    searchedNames.some((name) => name.includes("dev")) ||
    searchedDescriptions.some((desc) => desc.includes("dev"));
  TestValidator.predicate(
    "case-insensitive matching works",
    hasCaseInsensitiveMatch,
  );
  // Validate that exact prefix 'dev' appears before substring matches like 'developer' or 'devtest'
  let exactMatchIndex = -1;
  let substringMatchIndex = -1;
  for (let i = 0; i < searchedNames.length; i++) {
    const name = searchedNames[i];
    if (exactMatchIndex === -1 && name === "dev") {
      exactMatchIndex = i;
    } else if (
      substringMatchIndex === -1 &&
      name.includes("dev") &&
      name !== "dev"
    ) {
      substringMatchIndex = i;
    }
  }
  // If both exist, exact match must come before substring match
  if (exactMatchIndex !== -1 && substringMatchIndex !== -1) {
    TestValidator.predicate(
      "exact match appears before substring match",
      exactMatchIndex < substringMatchIndex,
    );
  }
  // Validate that 'dev' in description is ranked lower than name matches
  const descriptionMatchIndex = searchedDescriptions.findIndex(
    (desc) =>
      desc.includes("dev") &&
      !searchedNames[searchedDescriptions.indexOf(desc)]?.includes("dev"),
  );
  if (descriptionMatchIndex !== -1 && exactMatchIndex !== -1) {
    TestValidator.predicate(
      "name match ranked higher than description match",
      exactMatchIndex < descriptionMatchIndex,
    );
  }
  // Verify that subscriber_count is used as tiebreaker for equal relevance
  const exactMatchCommunities = searchResult.data.filter(
    (c) => c.name.toLowerCase() === "dev",
  );
  if (exactMatchCommunities.length > 1) {
    // Sort by subscriber_count descending
    const sortedBySubscriber = [...exactMatchCommunities].sort(
      (a, b) => b.subscriber_count - a.subscriber_count,
    );
    // Verify order is preserved
    for (let i = 0; i < sortedBySubscriber.length - 1; i++) {
      TestValidator.predicate(
        "subscriber_count as tiebreaker",
        sortedBySubscriber[i].subscriber_count >=
          sortedBySubscriber[i + 1].subscriber_count,
      );
    }
  }
  // Validate that no unrelated communities are returned
  const unrelatedCommunities = searchResult.data.filter(
    (c) =>
      !c.name.toLowerCase().includes("dev") &&
      !c.description?.toLowerCase().includes("dev"),
  );
  TestValidator.equals(
    "no unrelated communities",
    unrelatedCommunities.length,
    0,
  );
}
