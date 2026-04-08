import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator statistics endpoint with empty data.
 *
 * Validates that the statistics endpoint returns correct zero counts when the system contains no data. This ensures the aggregation logic handles empty database states properly without errors.
 *
 * The test creates an administrator account, authenticates, and verifies all statistics metrics return zero values including order status counts, product count, and pending request counts.
 *
 * 1. Create administrator account and authenticate using authorize_admin_join
 * 2. Call the statistics endpoint without any data in the system
 * 3. Verify all order status counts are zero (paid, shipped, delivered, cancelled, refunded, partially_completed)
 * 4. Verify product count is zero
 * 5. Verify pending cancellation and refund request counts are zero
 */
export async function test_api_admin_statistics_empty_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Call statistics endpoint (no data exists in system)
  const statistics =
    await api.functional.ecommerce.admin.statistics.at(adminConnection);
  typia.assert(statistics);
  // 3. Verify all order status counts are zero
  TestValidator.equals("paid orders count", statistics.orders.paid, 0);
  TestValidator.equals("shipped orders count", statistics.orders.shipped, 0);
  TestValidator.equals(
    "delivered orders count",
    statistics.orders.delivered,
    0,
  );
  TestValidator.equals(
    "cancelled orders count",
    statistics.orders.cancelled,
    0,
  );
  TestValidator.equals("refunded orders count", statistics.orders.refunded, 0);
  TestValidator.equals(
    "partially_completed orders count",
    statistics.orders.partially_completed,
    0,
  );
  // 4. Verify product count is zero
  TestValidator.equals("products count", statistics.products, 0);
  // 5. Verify pending request counts are zero
  TestValidator.equals(
    "pending cancellation requests count",
    statistics.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pending refund requests count",
    statistics.pendingRefundRequests,
    0,
  );
}
