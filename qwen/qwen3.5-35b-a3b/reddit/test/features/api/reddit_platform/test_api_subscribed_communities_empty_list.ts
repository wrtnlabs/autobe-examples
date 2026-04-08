import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscribed_communities_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member with no subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // Update connection with member's auth token
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // 2. Test empty subscription list with default pagination
  let result: IPageIRedditPlatformSubscription.ISummary =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  TestValidator.equals("empty - data array is empty", result.data, []);
  TestValidator.equals(
    "empty - current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("empty - limit is 20", result.pagination.limit, 20);
  TestValidator.equals("empty - records is 0", result.pagination.records, 0);
  TestValidator.equals("empty - pages is 0", result.pagination.pages, 0);
  // 3. Test with different pagination parameters
  result =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "page=2,limit=10 - data array is empty",
    result.data,
    [],
  );
  TestValidator.equals(
    "page=2,limit=10 - current page is 2",
    result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page=2,limit=10 - limit is 10",
    result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page=2,limit=10 - records is 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "page=2,limit=10 - pages is 0",
    result.pagination.pages,
    0,
  );
  // 4. Test with search filter
  result =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      {
        body: {
          search: "test",
        },
      },
    );
  typia.assert(result);
  TestValidator.equals("search - data array is empty", result.data, []);
  TestValidator.equals("search - records is 0", result.pagination.records, 0);
  TestValidator.equals("search - pages is 0", result.pagination.pages, 0);
  // 5. Test with sort parameters
  result =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      {
        body: {
          sort_by: "name",
          sort_order: "asc",
        },
      },
    );
  typia.assert(result);
  TestValidator.equals("sort - data array is empty", result.data, []);
  TestValidator.equals("sort - records is 0", result.pagination.records, 0);
  TestValidator.equals("sort - pages is 0", result.pagination.pages, 0);
  // 6. Test with date filters
  result =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      memberConnection,
      {
        body: {
          subscribed_at_gte: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          subscribed_at_lte: new Date().toISOString(),
        },
      },
    );
  typia.assert(result);
  TestValidator.equals("date filter - data array is empty", result.data, []);
  TestValidator.equals(
    "date filter - records is 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals("date filter - pages is 0", result.pagination.pages, 0);
}
