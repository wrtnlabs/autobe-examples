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

export async function test_api_rate_limit_counters_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResult);
  // Create authenticated member connection
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinResult.token.access },
  };
  // 2. Test empty results with no matching filters
  const emptyFilterResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          member_id: "00000000-0000-0000-0000-000000000000",
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.equals(
    "non-existent member returns empty",
    emptyFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty member filter pagination current",
    emptyFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty member filter pagination records",
    emptyFilterResponse.pagination.records,
    0,
  );
  // 3. Test filtering by request_count range
  const requestCountFilterResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          request_count_min: 0,
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(requestCountFilterResponse);
  TestValidator.predicate("all returned counters have request_count >= 0", () =>
    requestCountFilterResponse.data.every(
      (counter) => counter.request_count >= 0,
    ),
  );
  // 4. Test filtering by endpoint (partial matching)
  const endpointFilterResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          endpoint: "/api",
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(endpointFilterResponse);
  TestValidator.predicate("endpoint filter returns matching counters", () =>
    endpointFilterResponse.data.every((counter) =>
      counter.endpoint.includes("/api"),
    ),
  );
  // 5. Test combined filters (AND logic)
  const combinedFilterResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          request_count_min: 0,
          endpoint: "/api",
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  TestValidator.predicate("combined filters return matching results", () =>
    combinedFilterResponse.data.every(
      (counter) =>
        counter.request_count >= 0 && counter.endpoint.includes("/api"),
    ),
  );
  // 6. Test sorting by window_start ascending
  const sortByWindowStartAscResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          sortBy: "window_start",
          sortOrder: "asc",
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(sortByWindowStartAscResponse);
  TestValidator.predicate("sorted by window_start ascending", () => {
    const timestamps = sortByWindowStartAscResponse.data.map((c) =>
      new Date(c.window_start).getTime(),
    );
    return timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1]);
  });
  // 7. Test sorting by window_start descending
  const sortByWindowStartDescResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          sortBy: "window_start",
          sortOrder: "desc",
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(sortByWindowStartDescResponse);
  TestValidator.predicate("sorted by window_start descending", () => {
    const timestamps = sortByWindowStartDescResponse.data.map((c) =>
      new Date(c.window_start).getTime(),
    );
    return timestamps.every((t, i) => i === 0 || t <= timestamps[i - 1]);
  });
  // 8. Test sorting by request_count ascending
  const sortByRequestCountAscResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          sortBy: "request_count",
          sortOrder: "asc",
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(sortByRequestCountAscResponse);
  TestValidator.predicate("sorted by request_count ascending", () => {
    const counts = sortByRequestCountAscResponse.data.map(
      (c) => c.request_count,
    );
    return counts.every((c, i) => i === 0 || c >= counts[i - 1]);
  });
  // 9. Test sorting by request_count descending
  const sortByRequestCountDescResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          sortBy: "request_count",
          sortOrder: "desc",
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(sortByRequestCountDescResponse);
  TestValidator.predicate("sorted by request_count descending", () => {
    const counts = sortByRequestCountDescResponse.data.map(
      (c) => c.request_count,
    );
    return counts.every((c, i) => i === 0 || c <= counts[i - 1]);
  });
  // 10. Test sorting by endpoint ascending
  const sortByEndpointAscResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          sortBy: "endpoint",
          sortOrder: "asc",
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(sortByEndpointAscResponse);
  TestValidator.predicate("sorted by endpoint ascending", () => {
    const endpoints = sortByEndpointAscResponse.data.map((c) => c.endpoint);
    return endpoints.every(
      (e, i) => i === 0 || e.localeCompare(endpoints[i - 1]) >= 0,
    );
  });
  // 11. Test sorting by endpoint descending
  const sortByEndpointDescResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          sortBy: "endpoint",
          sortOrder: "desc",
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(sortByEndpointDescResponse);
  TestValidator.predicate("sorted by endpoint descending", () => {
    const endpoints = sortByEndpointDescResponse.data.map((c) => c.endpoint);
    return endpoints.every(
      (e, i) => i === 0 || e.localeCompare(endpoints[i - 1]) <= 0,
    );
  });
  // 12. Test pagination with filtered results
  const paginationResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination page 1",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit 10",
    paginationResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    () => paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    () => paginationResponse.pagination.pages >= 0,
  );
  // 13. Test pagination with filters
  const paginationWithFilterResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          endpoint: "/api",
          limit: 5,
          page: 1,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(paginationWithFilterResponse);
  TestValidator.equals(
    "filtered pagination page 1",
    paginationWithFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit 5",
    paginationWithFilterResponse.pagination.limit,
    5,
  );
  // 14. Verify filtered results match filter criteria
  TestValidator.predicate("filtered results all match endpoint filter", () =>
    paginationWithFilterResponse.data.every((counter) =>
      counter.endpoint.includes("/api"),
    ),
  );
  // 15. Test member_id filter
  const memberFilterResponse =
    await api.functional.redditCommunity.rate_limit_counters.index(
      authenticatedMemberConnection,
      {
        body: {
          member_id: joinResult.token.access,
          limit: 100,
        } satisfies IRedditCommunityRateLimitCounter.IRequest,
      },
    );
  typia.assert(memberFilterResponse);
  // Verify member filter structure (may return empty if no counters yet)
  TestValidator.equals(
    "member filter returns expected count",
    memberFilterResponse.data.length,
    memberFilterResponse.data.filter(
      (counter) => counter.member.id === joinResult.token.access,
    ).length,
  );
}
