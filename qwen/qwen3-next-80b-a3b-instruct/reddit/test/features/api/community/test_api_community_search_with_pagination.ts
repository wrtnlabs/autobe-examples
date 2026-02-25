import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(owner);
  // 2. Get all communities to establish baseline for comparison
  const unpaginatedResult =
    await api.functional.redditCommunity.communityOwner.communities.search.index(
      ownerConnection,
      {
        body: {
          search: undefined, // All communities
          limit: 100, // Large limit to get as many as possible
          page: 1,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(unpaginatedResult);
  // 3. Perform paginated search with limit=10, page=2
  const paginatedResult =
    await api.functional.redditCommunity.communityOwner.communities.search.index(
      ownerConnection,
      {
        body: {
          limit: 10,
          page: 2,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page is 2",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals("limit is 10", paginatedResult.pagination.limit, 10);
  TestValidator.equals(
    "records matches total from unpaginated",
    paginatedResult.pagination.records,
    unpaginatedResult.pagination.records,
  );
  TestValidator.predicate("pages >= 2", paginatedResult.pagination.pages >= 2);
  // 5. Validate number of communities on page 2
  TestValidator.predicate(
    "page 2 has at most 10 communities",
    paginatedResult.data.length <= 10,
  );
  // 6. Validate no duplicates or skipped results by comparing with unpaginated results
  // Extract IDs from first page and second page
  const allCommunities = unpaginatedResult.data;
  const secondPageCommunities = paginatedResult.data;
  // Validate that second page starts right after first page
  // First page has 10 items (if available), so second page should start at index 10
  const firstPageCount = Math.min(10, allCommunities.length);
  const secondPageStartIndex = firstPageCount;
  if (secondPageStartIndex < allCommunities.length) {
    TestValidator.equals(
      "second page community 1 matches unpaginated community after first page",
      secondPageCommunities[0]?.id,
      allCommunities[secondPageStartIndex]?.id,
    );
  }
  // Validate ordering consistency between paginated and unpaginated
  // Verify that the second page is a direct continuation of the first page
  for (let i = 0; i < secondPageCommunities.length; i++) {
    const expectedIndex = secondPageStartIndex + i;
    if (expectedIndex < allCommunities.length) {
      TestValidator.equals(
        `second page community ${i} matches unpaginated community at index ${expectedIndex}`,
        secondPageCommunities[i].id,
        allCommunities[expectedIndex].id,
      );
    }
  }
  // Validate that page 2 communities are contained within the full list
  const secondPageIds = secondPageCommunities.map((c) => c.id);
  const allIds = allCommunities.map((c) => c.id);
  for (const id of secondPageIds) {
    TestValidator.predicate(
      "community in page 2 exists in full list",
      allIds.includes(id),
    );
  }
}
