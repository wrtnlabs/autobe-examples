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

export async function test_api_admin_circuit_breakers_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Call circuit breaker monitoring endpoint with admin authorization
  const response =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate default pagination values when no parameters provided
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  // 4. Calculate expected pages based on records and limit
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Validate data array exists
  typia.assert(response.data);
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 6. Validate each circuit breaker record structure
  for (const cb of response.data) {
    typia.assert(cb);
    // Validate id field - must be UUID format
    typia.assert<string & tags.Format<"uuid">>(cb.id);
    TestValidator.predicate(
      "id is valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cb.id,
      ),
    );
    // Validate serviceName field
    TestValidator.predicate(
      "serviceName is not empty",
      cb.serviceName.length > 0,
    );
    // Validate state field - must be closed, half-open, or open
    typia.assert<"closed" | "half-open" | "open">(cb.state);
    // Validate failureCount field - must be int32 >= 0
    typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      cb.failureCount,
    );
    TestValidator.predicate(
      "failureCount is non-negative",
      cb.failureCount >= 0,
    );
    // Validate successCount field - must be int32 >= 0
    typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      cb.successCount,
    );
    TestValidator.predicate(
      "successCount is non-negative",
      cb.successCount >= 0,
    );
    // Validate lastFailureTime field - must be valid ISO datetime
    typia.assert<string & tags.Format<"date-time">>(cb.lastFailureTime);
    TestValidator.predicate(
      "lastFailureTime is valid ISO datetime",
      !isNaN(Date.parse(cb.lastFailureTime)),
    );
    // Validate openedAt field - must be string | null
    if (cb.openedAt !== null && cb.openedAt !== undefined) {
      typia.assertGuard(cb.openedAt);
      typia.assert<string & tags.Format<"date-time">>(cb.openedAt);
    }
    // Validate nextProbeTime field - must be string | null
    if (cb.nextProbeTime !== null && cb.nextProbeTime !== undefined) {
      typia.assertGuard(cb.nextProbeTime);
      typia.assert<string & tags.Format<"date-time">>(cb.nextProbeTime);
    }
    // Validate createdAt field - must be valid ISO datetime
    typia.assert<string & tags.Format<"date-time">>(cb.createdAt);
    TestValidator.predicate(
      "createdAt is valid ISO datetime",
      !isNaN(Date.parse(cb.createdAt)),
    );
    // Validate updatedAt field - must be valid ISO datetime
    typia.assert<string & tags.Format<"date-time">>(cb.updatedAt);
    TestValidator.predicate(
      "updatedAt is valid ISO datetime",
      !isNaN(Date.parse(cb.updatedAt)),
    );
    // Validate relationship: openedAt should be >= lastFailureTime when openedAt is not null
    if (cb.openedAt !== null && cb.openedAt !== undefined) {
      typia.assertGuard(cb.openedAt);
      typia.assert<string & tags.Format<"date-time">>(cb.openedAt);
      TestValidator.predicate(
        "openedAt >= lastFailureTime",
        new Date(cb.openedAt) >= new Date(cb.lastFailureTime),
      );
    }
    // Validate relationship: nextProbeTime should be >= openedAt when both present
    if (
      cb.nextProbeTime !== null &&
      cb.nextProbeTime !== undefined &&
      cb.openedAt !== null &&
      cb.openedAt !== undefined
    ) {
      typia.assertGuard(cb.nextProbeTime);
      typia.assert<string & tags.Format<"date-time">>(cb.nextProbeTime);
      typia.assertGuard(cb.openedAt);
      typia.assert<string & tags.Format<"date-time">>(cb.openedAt);
      TestValidator.predicate(
        "nextProbeTime >= openedAt",
        new Date(cb.nextProbeTime) >= new Date(cb.openedAt),
      );
    }
  }
  // 7. Test with state filtering
  const filteredResponse =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      adminConnection,
      {
        body: {
          states: ["open"] as ("open" | "half-open" | "closed")[],
        },
      },
    );
  typia.assert(filteredResponse);
  // 8. Verify filtered results match filter criteria
  if (filteredResponse.data.length > 0) {
    for (const cb of filteredResponse.data) {
      typia.assert(cb);
      TestValidator.equals("filtered state is open", cb.state, "open");
    }
  }
  // 9. Test with service name filtering
  const serviceNameResponse =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      adminConnection,
      {
        body: {
          serviceName: "api",
        },
      },
    );
  typia.assert(serviceNameResponse);
  // 10. Test sorting functionality
  const sortedResponse =
    await api.functional.redditPlatform.admin.monitoring.circuit_breakers.index(
      adminConnection,
      {
        body: {
          sortBy: "failureCount" as const,
          sortOrder: "desc" as const,
        },
      },
    );
  typia.assert(sortedResponse);
  // 11. Validate empty data scenario - when no circuit breakers configured
  if (response.data.length === 0) {
    TestValidator.equals(
      "empty response has zero records",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty response has zero pages",
      response.pagination.pages,
      0,
    );
  }
}
