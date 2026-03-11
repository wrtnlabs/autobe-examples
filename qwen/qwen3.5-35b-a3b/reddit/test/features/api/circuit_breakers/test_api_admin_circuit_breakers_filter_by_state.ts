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

export async function test_api_admin_circuit_breakers_filter_by_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create new connection with admin token for circuit breaker operations
  const circuitBreakerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: adminAuth.token.access,
    },
  };
  // 2. Test single state filter: states = ['open']
  const openFilterResponse =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      circuitBreakerConnection,
      {
        body: {
          states: ["open"],
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(openFilterResponse);
  // Validate all returned circuit breakers are in 'open' state
  const allOpenStates = openFilterResponse.data.every(
    (cb) => cb.state === "open",
  );
  TestValidator.predicate("all circuit breakers are open state", allOpenStates);
  // Validate pagination metadata matches filtered results
  TestValidator.equals(
    "pagination total records matches data count",
    openFilterResponse.pagination.records,
    openFilterResponse.data.length,
  );
  // Validate pages calculation: Math.ceil(records / limit)
  const expectedPages = Math.ceil(
    openFilterResponse.pagination.records / openFilterResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    expectedPages,
    openFilterResponse.pagination.pages,
  );
  // 3. Test multiple states filter: states = ['half-open', 'closed']
  const multipleStatesResponse =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      circuitBreakerConnection,
      {
        body: {
          states: ["half-open", "closed"],
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(multipleStatesResponse);
  // Validate all returned circuit breakers are either 'half-open' OR 'closed'
  const allMultipleStates = multipleStatesResponse.data.every(
    (cb) => cb.state === "half-open" || cb.state === "closed",
  );
  TestValidator.predicate(
    "all circuit breakers are half-open or closed state",
    allMultipleStates,
  );
  // Validate no 'open' state circuit breakers in response
  const noOpenInMultiple = multipleStatesResponse.data.every(
    (cb) => cb.state !== "open",
  );
  TestValidator.predicate(
    "no open state in multiple states filter",
    noOpenInMultiple,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination total records matches data count (multiple states)",
    multipleStatesResponse.pagination.records,
    multipleStatesResponse.data.length,
  );
  // 4. Test non-existent state filter: states = ['non-existent']
  const nonExistentResponse =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      circuitBreakerConnection,
      {
        body: {
          states: typia.assert<("open" | "half-open" | "closed")[]>(["non-existent"]),
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(nonExistentResponse);
  // Validate empty data array
  TestValidator.equals(
    "non-existent state returns empty data array",
    nonExistentResponse.data.length,
    0,
  );
  // Validate pagination metadata for empty results
  TestValidator.equals(
    "pagination total records = 0",
    nonExistentResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages = 0",
    nonExistentResponse.pagination.pages,
    0,
  );
}