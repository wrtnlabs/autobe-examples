import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallShippingPerformanceStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformanceStat";

/**
 * Validate that admin shipping performance stat detail requires authorization.
 *
 * Business goal: Ensure that the admin-only analytics endpoint GET
 * /shoppingMall/admin/analytics/shippingPerformanceStats/{shippingPerformanceStatId}
 * rejects requests that are sent without a valid admin Authorization token.
 *
 * Covered cases:
 *
 * 1. Anonymous request (no Authorization header) must fail.
 * 2. Request with an obviously invalid bearer token string must fail.
 *
 * We intentionally do NOT assert specific HTTP status codes or error response
 * bodies, because those transport-level details are outside the stable contract
 * for this E2E test harness. We only validate that an error is produced.
 */
export async function test_api_admin_shipping_performance_stat_detail_authorization_required(
  connection: api.IConnection,
) {
  // Use a syntactically valid, random UUID for the path param. Whether it
  // exists or not is irrelevant because we only care about authorization
  // behavior, not existence vs 404.
  const statId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 1. Anonymous connection: derive from the provided connection but wipe
  // headers to simulate a completely unauthenticated client. We follow the
  // rule that headers are only set at creation time and never mutated later.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous access to admin shipping stat detail must fail",
    async () => {
      await api.functional.shoppingMall.admin.analytics.shippingPerformanceStats.at(
        anonymousConnection,
        {
          shippingPerformanceStatId: statId,
        },
      );
    },
  );

  // 2. Connection with an obviously invalid/garbled bearer token.
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: "Bearer invalid-admin-token-for-test",
    },
  };

  await TestValidator.error(
    "access with invalid admin token to shipping stat detail must fail",
    async () => {
      await api.functional.shoppingMall.admin.analytics.shippingPerformanceStats.at(
        invalidTokenConnection,
        {
          shippingPerformanceStatId: statId,
        },
      );
    },
  );
}
