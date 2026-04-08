import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
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

export async function test_api_community_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member using utility function
  // This will update memberConnection.headers with the auth token internally
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(auth);
  // 2. Search with non-matching query (simulating empty results)
  // No communities exist in test database, so any query returns empty results
  const nonMatchingQuery = "xyznonexistent123";
  const emptyResult =
    await api.functional.redditPlatform.member.communities.search.index(
      memberConnection,
      {
        body: {
          q: nonMatchingQuery,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 3. Verify empty result structure for non-matching query
  TestValidator.equals(
    "data array is empty for non-matching query",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "total records is 0 for non-matching query",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page is 1 for non-matching query",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches requested for non-matching query",
    emptyResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pages is 0 for empty results",
    emptyResult.pagination.pages,
    0,
  );
  // 4. Search with very short query (1 character, minimum allowed)
  const shortQuery = "a";
  const shortResult =
    await api.functional.redditPlatform.member.communities.search.index(
      memberConnection,
      {
        body: {
          q: shortQuery,
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(shortResult);
  TestValidator.equals(
    "short query returns empty data",
    shortResult.data.length,
    0,
  );
  TestValidator.equals(
    "short query has 0 records",
    shortResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "short query has 0 pages",
    shortResult.pagination.pages,
    0,
  );
  // 5. Verify system continues to function with different empty query
  const anotherEmptyQuery = "nonexistent_community_xyz";
  const anotherResult =
    await api.functional.redditPlatform.member.communities.search.index(
      memberConnection,
      {
        body: {
          q: anotherEmptyQuery,
          page: 1,
          limit: 5,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(anotherResult);
  TestValidator.equals(
    "another empty query has empty data",
    anotherResult.data.length,
    0,
  );
  TestValidator.equals(
    "another empty query has 0 pages",
    anotherResult.pagination.pages,
    0,
  );
  // 6. Test search with whitespace-only query (edge case)
  // Query with only spaces should still return empty results gracefully
  const whitespaceQuery = "   ";
  const whitespaceResult =
    await api.functional.redditPlatform.member.communities.search.index(
      memberConnection,
      {
        body: {
          q: whitespaceQuery,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(whitespaceResult);
  TestValidator.equals(
    "whitespace query returns empty data",
    whitespaceResult.data.length,
    0,
  );
  TestValidator.equals(
    "whitespace query has 0 records",
    whitespaceResult.pagination.records,
    0,
  );
  // 7. Verify pagination metadata consistency across all empty result searches
  TestValidator.equals(
    "all empty searches have pages of 0",
    emptyResult.pagination.pages,
    whitespaceResult.pagination.pages,
  );
  TestValidator.equals(
    "current page defaults to 1 for all searches",
    emptyResult.pagination.current,
    shortResult.pagination.current,
  );
}
