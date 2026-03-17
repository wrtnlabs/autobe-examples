import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityRateLimitCounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRateLimitCounter";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityRateLimitCounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRateLimitCounter";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_rate_limit_counters_empty_results_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Test with non-existent member_id
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  const response1 =
    await api.functional.redditCommunity.rate_limit_counters.index(
      memberConnection,
      {
        body: {
          member_id: nonExistentId,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.equals("response has valid structure", response1.pagination, {
    current: 1,
    limit: 20,
    records: 0,
    pages: 0,
  });
  TestValidator.equals("data array is empty", response1.data.length, 0);
  // 3. Test with future window_start
  const futureTime = new Date(2099, 0, 1).toISOString();
  const response2 =
    await api.functional.redditCommunity.rate_limit_counters.index(
      memberConnection,
      {
        body: {
          window_start: futureTime,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals(
    "empty result has correct pagination",
    response2.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", response2.pagination.pages, 0);
  // 4. Test with invalid endpoint filter
  const response3 =
    await api.functional.redditCommunity.rate_limit_counters.index(
      memberConnection,
      {
        body: {
          endpoint: "/non-existent/path/that/does/not/exist",
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "invalid endpoint yields empty results",
    response3.data.length,
    0,
  );
  // 5. Test with minimum limit (1)
  const response4 =
    await api.functional.redditCommunity.rate_limit_counters.index(
      memberConnection,
      {
        body: {
          limit: 1,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "minimum limit preserved",
    response4.pagination.limit,
    1,
  );
  TestValidator.equals("empty data with limit 1", response4.data.length, 0);
  // 6. Test with maximum limit (100)
  const response5 =
    await api.functional.redditCommunity.rate_limit_counters.index(
      memberConnection,
      {
        body: {
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(response5);
  TestValidator.equals(
    "maximum limit preserved",
    response5.pagination.limit,
    100,
  );
  // 7. Test sorting with empty results
  const response6 =
    await api.functional.redditCommunity.rate_limit_counters.index(
      memberConnection,
      {
        body: {
          sortBy: "window_start",
          sortOrder: "desc",
          member_id: nonExistentId,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(response6);
  TestValidator.equals(
    "sorting applied on empty results",
    response6.data.length,
    0,
  );
  // 8. Test with all pagination params combined
  const response7 =
    await api.functional.redditCommunity.rate_limit_counters.index(
      memberConnection,
      {
        body: {
          member_id: nonExistentId,
          endpoint: "/non-existent",
          request_count_min: 100,
          window_start: futureTime,
          page: 1,
          limit: 50,
          sortBy: "request_count",
          sortOrder: "asc",
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(response7);
  TestValidator.equals("combined filters empty", response7.data.length, 0);
  TestValidator.equals("page 1 preserved", response7.pagination.current, 1);
  TestValidator.equals("limit 50 preserved", response7.pagination.limit, 50);
  TestValidator.equals("records 0 for empty", response7.pagination.records, 0);
  TestValidator.equals("pages 0 for empty", response7.pagination.pages, 0);
  // 9. Test page parameter greater than total pages
  const response8 =
    await api.functional.redditCommunity.rate_limit_counters.index(
      memberConnection,
      {
        body: {
          member_id: nonExistentId,
          page: 999,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(response8);
  TestValidator.equals("page 999 returns empty", response8.data.length, 0);
  TestValidator.equals(
    "page 999 metadata valid",
    response8.pagination.current,
    999,
  );
  TestValidator.equals("records still 0", response8.pagination.records, 0);
  TestValidator.equals("pages still 0", response8.pagination.pages, 0);
}
