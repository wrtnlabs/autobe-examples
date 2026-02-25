import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_platform_moderator_communities_list_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and auth
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: `https://example.com/avatar/${RandomGenerator.alphabets(8)}.png`,
    },
  });
  moderatorConnection.headers = { Authorization: moderator.token.access };
  // 2. Try to get the communities list with no filter (default)
  const defaultResponse =
    await api.functional.communityPlatform.moderator.communities.index(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has data array",
    Array.isArray(defaultResponse.data) && defaultResponse.data.length >= 0,
  );
  // 3. Test filtering by partial community name matching
  // If no data exists, create synthetic data is impossible in e2e, so just test partial string from existing
  if (defaultResponse.data.length > 0) {
    const sampleCommunity = defaultResponse.data[0];
    const partialName = sampleCommunity.name.substring(0, 3);
    const filterByNameResponse =
      await api.functional.communityPlatform.moderator.communities.index(
        moderatorConnection,
        { body: { name: partialName } },
      );
    typia.assert(filterByNameResponse);
    // All returned community names should include the partialName
    for (const community of filterByNameResponse.data) {
      TestValidator.predicate(
        `community name includes filter string '${partialName}'`,
        community.name.includes(partialName),
      );
    }
  }
  // 4. Test sorting by 'new' (descending createdAt) - newer communities first
  const sortNewResponse =
    await api.functional.communityPlatform.moderator.communities.index(
      moderatorConnection,
      { body: { sort: "new" } },
    );
  typia.assert(sortNewResponse);
  for (let i = 1; i < sortNewResponse.data.length; ++i) {
    const prevDate = new Date(sortNewResponse.data[i - 1].createdAt);
    const currDate = new Date(sortNewResponse.data[i].createdAt);
    TestValidator.predicate(
      "communities sorted newest first",
      prevDate >= currDate,
    );
  }
  // 5. Test sorting by 'old' (ascending createdAt) - older communities first
  const sortOldResponse =
    await api.functional.communityPlatform.moderator.communities.index(
      moderatorConnection,
      { body: { sort: "old" } },
    );
  typia.assert(sortOldResponse);
  for (let i = 1; i < sortOldResponse.data.length; ++i) {
    const prevDate = new Date(sortOldResponse.data[i - 1].createdAt);
    const currDate = new Date(sortOldResponse.data[i].createdAt);
    TestValidator.predicate(
      "communities sorted oldest first",
      prevDate <= currDate,
    );
  }
  // 6. Test sorting by popular (descending subscriberCount)
  const sortPopularResponse =
    await api.functional.communityPlatform.moderator.communities.index(
      moderatorConnection,
      { body: { sort: "popular" } },
    );
  typia.assert(sortPopularResponse);
  for (let i = 1; i < sortPopularResponse.data.length; ++i) {
    TestValidator.predicate(
      "communities sorted by popular subscriberCount desc",
      sortPopularResponse.data[i - 1].subscriberCount >=
        sortPopularResponse.data[i].subscriberCount,
    );
  }
  // 7. Test pagination: page & limit
  const limit = 2;
  const page1Response =
    await api.functional.communityPlatform.moderator.communities.index(
      moderatorConnection,
      { body: { limit, page: 1, sort: "new" } },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.communityPlatform.moderator.communities.index(
      moderatorConnection,
      { body: { limit, page: 2, sort: "new" } },
    );
  typia.assert(page2Response);
  // Ensure different data between two pages
  const idsPage1 = page1Response.data.map((c) => c.id);
  const idsPage2 = page2Response.data.map((c) => c.id);
  TestValidator.notEquals(
    "different communities in different pages",
    idsPage1,
    idsPage2,
  );
  // 8. Test edge case: search returns empty results
  const improbableSearch = `zzzzzzzzzzz${RandomGenerator.alphabets(10)}`;
  const emptySearchResponse =
    await api.functional.communityPlatform.moderator.communities.index(
      moderatorConnection,
      { body: { name: improbableSearch } },
    );
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty search returns zero data",
    emptySearchResponse.data.length,
    0,
  );
  // 9. Test that unauthorized access is denied
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access denied", async () => {
    await api.functional.communityPlatform.moderator.communities.index(
      unauthConnection,
      { body: {} },
    );
  });
}
