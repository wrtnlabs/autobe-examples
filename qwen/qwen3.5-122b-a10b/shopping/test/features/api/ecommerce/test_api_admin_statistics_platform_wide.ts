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
 * Test administrator platform-wide e-commerce statistics retrieval.
 *
 * Validates that an authenticated administrator can successfully retrieve aggregated platform statistics including order counts by status, product counts, and pending cancellation/refund request counts. The test focuses on verifying the statistics endpoint returns properly structured data with all required fields.
 *
 * The test authenticates as an administrator and calls the statistics endpoint to verify the response structure and type safety. Since no SDK functions are available to create orders, products, or requests, this test validates the endpoint structure rather than data accuracy against created entities.
 *
 * 1. Create and authenticate an administrator account using authorize_admin_join utility
 * 2. Call the platform-wide statistics endpoint (GET /ecommerce/admin/statistics)
 * 3. Validate response structure using typia.assert for complete type validation
 * 4. Verify all order status counts exist and are non-negative integers
 * 5. Verify product count exists and is non-negative integer
 * 6. Verify pending cancellation and refund request counts exist and are non-negative integers
 */
export async function test_api_admin_statistics_platform_wide(
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Call platform-wide statistics endpoint
  const statistics: IEcommerceStatistic =
    await api.functional.ecommerce.admin.statistics.at(adminConnection);
  typia.assert(statistics);
  // 3. Verify order status counts exist and are non-negative integers
  TestValidator.predicate(
    "paid count non-negative",
    statistics.orders.paid >= 0,
  );
  TestValidator.predicate(
    "shipped count non-negative",
    statistics.orders.shipped >= 0,
  );
  TestValidator.predicate(
    "delivered count non-negative",
    statistics.orders.delivered >= 0,
  );
  TestValidator.predicate(
    "cancelled count non-negative",
    statistics.orders.cancelled >= 0,
  );
  TestValidator.predicate(
    "refunded count non-negative",
    statistics.orders.refunded >= 0,
  );
  TestValidator.predicate(
    "partially_completed count non-negative",
    statistics.orders.partially_completed >= 0,
  );
  // 4. Verify product count exists and is non-negative
  TestValidator.predicate(
    "product count non-negative",
    statistics.products >= 0,
  );
  // 5. Verify pending request counts exist and are non-negative
  TestValidator.predicate(
    "pending cancellation requests non-negative",
    statistics.pendingCancellationRequests >= 0,
  );
  TestValidator.predicate(
    "pending refund requests non-negative",
    statistics.pendingRefundRequests >= 0,
  );
}
