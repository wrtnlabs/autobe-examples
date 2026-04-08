import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_users_listing_with_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple member users with different karma scores and usernames
  const authResponses: IRedditPlatformMember.IAuthorized[] =
    await ArrayUtil.asyncMap(
      ArrayUtil.repeat(10, (i) => {
        const joinConnection: api.IConnection = { host: connection.host };
        const body = {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          username: `user${i}_${RandomGenerator.alphaNumeric(5)}`,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformMember.IJoin;
        return authorize_member_join(joinConnection, { body });
      }),
      (authResponse) => authResponse,
    );
  typia.assert(authResponses);
  // 2. Use first user's connection for listing access
  const listingConnection: api.IConnection = { host: connection.host };
  const auth = authResponses[0];
  typia.assert(auth);
  listingConnection.headers ??= {};
  listingConnection.headers.Authorization = auth.token.access;
  // 3. Test username search: case-insensitive partial matching
  const searchResults = await api.functional.redditPlatform.users.index(
    listingConnection,
    {
      body: {
        search_username: "user",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(searchResults);
  // 4. Test karma filtering: karma_min only (karma_max not available in API)
  const karmaFilterResults = await api.functional.redditPlatform.users.index(
    listingConnection,
    {
      body: {
        karma_min: 0,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(karmaFilterResults);
  // 5. Test sorting by karma descending
  const sortDescResults = await api.functional.redditPlatform.users.index(
    listingConnection,
    {
      body: {
        sort_by: "karma",
        sort_order: "desc",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(sortDescResults);
  // 6. Test sorting by karma ascending
  const sortAscResults = await api.functional.redditPlatform.users.index(
    listingConnection,
    {
      body: {
        sort_by: "karma",
        sort_order: "asc",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(sortAscResults);
  // 7. Test sorting by username
  const sortUsernameResults = await api.functional.redditPlatform.users.index(
    listingConnection,
    {
      body: {
        sort_by: "username",
        sort_order: "asc",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(sortUsernameResults);
  // 8. Test pagination
  const pageResults = await api.functional.redditPlatform.users.index(
    listingConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(pageResults);
  // 9. Test page navigation
  const page2Results = await api.functional.redditPlatform.users.index(
    listingConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(page2Results);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    pageResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 5",
    pageResults.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records is at least 0",
    pageResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 0",
    pageResults.pagination.pages >= 0,
  );
  // Validate pagination does not exceed limit
  TestValidator.predicate(
    "page 1 results do not exceed limit",
    pageResults.data.length <= pageResults.pagination.limit,
  );
  TestValidator.predicate(
    "page 2 results do not exceed limit",
    page2Results.data.length <= page2Results.pagination.limit,
  );
  // Validate sort order for karma descending
  if (sortDescResults.data.length > 1) {
    for (let i = 0; i < sortDescResults.data.length - 1; i++) {
      const a = sortDescResults.data[i] as IRedditPlatformMember.ISummary;
      const b = sortDescResults.data[i + 1] as IRedditPlatformMember.ISummary;
      TestValidator.predicate(
        `karma descending order at index ${i}`,
        a.karma >= b.karma,
      );
    }
  }
  // Validate sort order for karma ascending
  if (sortAscResults.data.length > 1) {
    for (let i = 0; i < sortAscResults.data.length - 1; i++) {
      const a = sortAscResults.data[i] as IRedditPlatformMember.ISummary;
      const b = sortAscResults.data[i + 1] as IRedditPlatformMember.ISummary;
      TestValidator.predicate(
        `karma ascending order at index ${i}`,
        a.karma <= b.karma,
      );
    }
  }
  // Validate sort order for username ascending
  if (sortUsernameResults.data.length > 1) {
    for (let i = 0; i < sortUsernameResults.data.length - 1; i++) {
      const a = sortUsernameResults.data[i] as IRedditPlatformMember.ISummary;
      const b = sortUsernameResults.data[
        i + 1
      ] as IRedditPlatformMember.ISummary;
      TestValidator.predicate(
        `username ascending order at index ${i}`,
        a.username.localeCompare(b.username) <= 0,
      );
    }
  }
}
