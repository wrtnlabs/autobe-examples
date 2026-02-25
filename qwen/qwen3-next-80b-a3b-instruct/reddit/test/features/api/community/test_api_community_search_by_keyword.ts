import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as guest to access public community search
  const guestConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_guest_join(guestConnection, {
    body: {} satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(authResponse);
  // Use search parameter with keyword 'tech'
  const searchBody: IRedditCommunityCommunity.IRequest = {
    search: "tech",
    page: 1,
    limit: 10,
  };
  const response = await api.functional.redditCommunity.communities.index(
    guestConnection,
    {
      body: searchBody,
    },
  );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals("pagination page", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate search results: communities must contain 'tech' in name or description (case-insensitive)
  // All results must be sorted by subscriber_count descending
  for (let i = 0; i < response.data.length; i++) {
    const community = response.data[i];
    const lowerName = community.name.toLowerCase();
    const lowerDesc = community.description.toLowerCase();
    TestValidator.predicate(
      "community name or description contains 'tech'",
      lowerName.includes("tech") || lowerDesc.includes("tech"),
    );
    // Ensure descending order by subscriber_count
    if (i > 0) {
      TestValidator.predicate(
        "descending subscriber count",
        response.data[i - 1].subscriber_count >= community.subscriber_count,
      );
    }
  }
  // Edge case: search with term that has no matches
  const noMatchBody: IRedditCommunityCommunity.IRequest = {
    search: "zzzzzzzzz", // Unlikely to exist
    page: 1,
    limit: 10,
  };
  const noMatchResponse =
    await api.functional.redditCommunity.communities.index(guestConnection, {
      body: noMatchBody,
    });
  typia.assert(noMatchResponse);
  TestValidator.equals("no match count", noMatchResponse.data.length, 0);
  TestValidator.equals(
    "no match pagination page",
    noMatchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "no match pagination limit",
    noMatchResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "no match pagination records",
    noMatchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match pagination pages",
    noMatchResponse.pagination.pages,
    0,
  );
}
