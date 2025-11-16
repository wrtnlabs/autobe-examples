import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallDisputeReasonStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeReasonStatistics";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate dispute reason statistics behavior when no disputes exist.
 *
 * Business purpose:
 *
 * - Ensure that the platform admin dispute reason statistics endpoint gracefully
 *   handles the case where there are no dispute records in the analysis
 *   window.
 * - Confirm that an authenticated platform admin can call the endpoint and
 *   receive a well-formed IShoppingMallDisputeReasonStatistics object even when
 *   the underlying shopping_mall_order_disputes table is empty.
 *
 * Scenario steps:
 *
 * 1. Register (join) a platform administrator via POST /auth/platformAdmin/join.
 *
 *    - This both creates the admin identity and issues JWT tokens.
 *    - The SDK will automatically attach the Authorization header to the provided
 *         connection instance; the test never manipulates headers directly.
 * 2. As the authenticated platform admin, call GET
 *    /shoppingMall/platformAdmin/statistics/disputeReasons via
 *    api.functional.shoppingMall.platformAdmin.statistics.disputeReasons.index.
 * 3. Validate that:
 *
 *    - The response is a valid IShoppingMallDisputeReasonStatistics object
 *         (typia.assert).
 *    - TotalDisputes is 0, representing the empty-data case.
 *    - ReasonGroups is an empty array.
 *    - From and to, which define the analysis window and are optional, are simply
 *         trusted via typia.assert for format correctness; no manual date
 *         parsing or format checks are needed.
 */
export async function test_api_platform_admin_dispute_reason_statistics_no_data_edge_case(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (join)
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Call dispute reason statistics endpoint as authenticated platform admin
  const stats: IShoppingMallDisputeReasonStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.disputeReasons.index(
      connection,
    );
  typia.assert<IShoppingMallDisputeReasonStatistics>(stats);

  // 3. Business-level validations for the no-data edge case
  TestValidator.equals(
    "totalDisputes should be zero when there are no disputes",
    stats.totalDisputes,
    0,
  );

  TestValidator.equals(
    "reasonGroups should be an empty array when there are no disputes",
    stats.reasonGroups.length,
    0,
  );

  // from and to are optional; typia.assert already guarantees correct
  // date-time typing when present, so no extra validation is required.
}
