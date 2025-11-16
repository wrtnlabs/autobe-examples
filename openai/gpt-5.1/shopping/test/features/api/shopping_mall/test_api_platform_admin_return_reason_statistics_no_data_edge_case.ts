import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallReturnReasonStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnReasonStatistics";

/**
 * Validate return-reason statistics behavior when there are no return requests.
 *
 * Business context: Platform admins use GET
 * /shoppingMall/platformAdmin/statistics/returnReasons to monitor aggregated
 * return reasons over a time window. Even when there are zero matching return
 * requests in `shopping_mall_order_return_requests`, the endpoint must still
 * return a fully-structured IShoppingMallReturnReasonStatistics object with
 * sensible defaults instead of errors or partial data.
 *
 * This test assumes standard test isolation where the underlying
 * shopping_mall_order_return_requests table starts empty. We do not attempt to
 * manipulate return-request data directly because no such APIs are defined in
 * the provided SDK; instead, we focus on verifying the no-data behavior
 * contract of the statistics endpoint.
 *
 * Steps:
 *
 * 1. Join as a new platform admin via POST /auth/platformAdmin/join, using a
 *    realistic IShoppingMallPlatformAdminJoin.IRequest payload. This call
 *    should also establish an authenticated admin session through the SDK
 *    (Authorization header management is handled internally by the client).
 * 2. As the authenticated platform admin, call
 *    api.functional.shoppingMall.platformAdmin.statistics.returnReasons.index
 *    with the shared `connection`.
 * 3. Assert that the response is a valid IShoppingMallReturnReasonStatistics
 *    instance via typia.assert.
 * 4. Verify business expectations for the "no data" edge case:
 *
 *    - TotalReturns === 0.
 *    - ReasonGroups is an empty array.
 *    - `from` and `to` are non-empty ISO 8601 date-time strings that form a valid
 *         time window where new Date(from) <= new Date(to).
 * 5. Ensure no errors are thrown and that all required fields are present,
 *    confirming that the endpoint gracefully handles an empty data set.
 */
export async function test_api_platform_admin_return_reason_statistics_no_data_edge_case(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join) to obtain an authorized session.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Call the return-reason statistics endpoint as the authenticated admin.
  const stats: IShoppingMallReturnReasonStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.returnReasons.index(
      connection,
    );
  typia.assert(stats);

  // 3. Validate business expectations for the no-data edge case.
  TestValidator.equals(
    "totalReturns should be zero when there are no return requests",
    0,
    stats.totalReturns,
  );

  TestValidator.equals(
    "reasonGroups should be an empty array when there are no return requests",
    stats.reasonGroups,
    [],
  );

  // Basic sanity checks for `from` and `to` time window fields.
  const fromTime = new Date(stats.from);
  const toTime = new Date(stats.to);

  await TestValidator.predicate(
    "from must be a valid date-time string",
    async () => !isNaN(fromTime.getTime()),
  );
  await TestValidator.predicate(
    "to must be a valid date-time string",
    async () => !isNaN(toTime.getTime()),
  );

  await TestValidator.predicate(
    "from must be less than or equal to to in the analysis window",
    async () => fromTime.getTime() <= toTime.getTime(),
  );
}
