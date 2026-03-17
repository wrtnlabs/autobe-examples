import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_empty_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test empty feed (no posts exist)
  const emptyFeed: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.member.popular.feed.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyFeed);
  // Validate pagination metadata for empty feed
  TestValidator.equals(
    "empty feed pagination current",
    emptyFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty feed pagination limit",
    emptyFeed.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty feed pagination records",
    emptyFeed.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty feed pagination pages",
    emptyFeed.pagination.pages,
    0,
  );
  TestValidator.equals("empty feed data array", emptyFeed.data.length, 0);
  // 3. Test pagination beyond available data (page=2 when only 1 page exists)
  const pageBeyondData: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.member.popular.feed.index(
      memberConnection,
      {
        body: {
          page: 2,
        },
      },
    );
  typia.assert(pageBeyondData);
  TestValidator.equals(
    "page beyond data pagination current",
    pageBeyondData.pagination.current,
    2,
  );
  TestValidator.equals(
    "page beyond data pagination limit",
    pageBeyondData.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page beyond data pagination records",
    pageBeyondData.pagination.records,
    0,
  );
  TestValidator.equals(
    "page beyond data pagination pages",
    pageBeyondData.pagination.pages,
    0,
  );
  TestValidator.equals(
    "page beyond data data array",
    pageBeyondData.data.length,
    0,
  );
  // 4. Test minimum page size (limit=1)
  const minPageSize: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.member.popular.feed.index(
      memberConnection,
      {
        body: {
          limit: 1,
        },
      },
    );
  typia.assert(minPageSize);
  TestValidator.equals(
    "min page size pagination current",
    minPageSize.pagination.current,
    1,
  );
  TestValidator.equals(
    "min page size pagination limit",
    minPageSize.pagination.limit,
    1,
  );
  TestValidator.equals(
    "min page size pagination records",
    minPageSize.pagination.records,
    0,
  );
  TestValidator.equals(
    "min page size pagination pages",
    minPageSize.pagination.pages,
    0,
  );
  TestValidator.equals("min page size data array", minPageSize.data.length, 0);
  // 5. Test maximum page size (limit=100)
  const maxPageSize: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.member.popular.feed.index(
      memberConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(maxPageSize);
  TestValidator.equals(
    "max page size pagination current",
    maxPageSize.pagination.current,
    1,
  );
  TestValidator.equals(
    "max page size pagination limit",
    maxPageSize.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max page size pagination records",
    maxPageSize.pagination.records,
    0,
  );
  TestValidator.equals(
    "max page size pagination pages",
    maxPageSize.pagination.pages,
    0,
  );
  TestValidator.equals("max page size data array", maxPageSize.data.length, 0);
  // 6. Test search parameter (filter by keyword in title)
  const searchTerm = RandomGenerator.alphaNumeric(8);
  const searchResult: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.member.popular.feed.index(
      memberConnection,
      {
        body: {
          search: searchTerm,
        },
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search pagination current",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "search pagination limit",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "search pagination records",
    searchResult.pagination.records,
    searchResult.data.length,
  );
  TestValidator.equals("search data array", searchResult.data.length, 0);
  // Validate all returned posts contain search term in title
  for (const post of searchResult.data) {
    const titleContainsSearch = post.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    TestValidator.predicate(
      `post title contains search term "${searchTerm}"`,
      titleContainsSearch,
    );
  }
}