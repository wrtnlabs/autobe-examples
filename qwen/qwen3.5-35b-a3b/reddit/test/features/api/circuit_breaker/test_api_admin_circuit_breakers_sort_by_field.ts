import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_circuit_breakers_sort_by_field(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Test sorting by 'state' (alphabetical order)
  const stateSortConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: adminAuth.token.access },
  };
  const stateSortResponse =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      stateSortConnection,
      {
        body: {
          sortBy: "state" as const,
          sortOrder: "asc" as const,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(stateSortResponse);
  // Validate sorting by state - should be in alphabetical order: closed, half-open, open
  const expectedStateOrder = [...stateSortResponse.data].sort((a, b) => {
    const stateOrder = { closed: 0, "half-open": 1, open: 2 };
    return stateOrder[a.state] - stateOrder[b.state];
  });
  TestValidator.index(
    "circuit breakers sorted by state ascending",
    expectedStateOrder,
    stateSortResponse.data,
  );
  // 3. Test sorting by 'failureCount' descending
  const failureCountSortConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: adminAuth.token.access },
  };
  const failureCountSortResponse =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      failureCountSortConnection,
      {
        body: {
          sortBy: "failureCount" as const,
          sortOrder: "desc" as const,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(failureCountSortResponse);
  // Validate sorting by failureCount descending - highest first
  const expectedFailureCountOrder = [...failureCountSortResponse.data].sort(
    (a, b) => b.failureCount - a.failureCount,
  );
  TestValidator.index(
    "circuit breakers sorted by failureCount descending",
    expectedFailureCountOrder,
    failureCountSortResponse.data,
  );
  // 4. Test sorting by 'lastFailure' ascending
  const lastFailureSortConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: adminAuth.token.access },
  };
  const lastFailureSortResponse =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      lastFailureSortConnection,
      {
        body: {
          sortBy: "lastFailure" as const,
          sortOrder: "asc" as const,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(lastFailureSortResponse);
  // Validate sorting by lastFailureTime ascending - oldest first
  const expectedLastFailureOrder = [...lastFailureSortResponse.data].sort(
    (a, b) => a.lastFailureTime.localeCompare(b.lastFailureTime),
  );
  TestValidator.index(
    "circuit breakers sorted by lastFailure ascending",
    expectedLastFailureOrder,
    lastFailureSortResponse.data,
  );
  // 5. Test default sorting (omit sortBy - should default to lastFailure desc)
  const defaultSortConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: adminAuth.token.access },
  };
  const defaultSortResponse =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      defaultSortConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(defaultSortResponse);
  // Validate default sorting is lastFailure descending
  const expectedDefaultOrder = [...defaultSortResponse.data].sort((a, b) =>
    b.lastFailureTime.localeCompare(a.lastFailureTime),
  );
  TestValidator.index(
    "circuit breakers with default sorting (lastFailure desc)",
    expectedDefaultOrder,
    defaultSortResponse.data,
  );
  // 6. Validate pagination metadata for each sort
  TestValidator.equals(
    "pagination current page for state sort",
    stateSortResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit for state sort",
    stateSortResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    stateSortResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    stateSortResponse.pagination.pages >= 0,
  );
}