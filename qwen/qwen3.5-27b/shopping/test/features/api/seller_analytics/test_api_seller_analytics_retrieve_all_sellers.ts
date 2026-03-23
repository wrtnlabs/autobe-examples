import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated administrator can retrieve comprehensive analytics data for all sellers on the platform.
 * 1. Authenticate as administrator using authorize_admin_join utility
 * 2. Retrieve seller analytics data from the admin endpoint
 * 3. Validate response structure and data integrity
 * 4. Verify seller analytics contains all required metrics
 * 5. Confirm proper data types and value ranges
 */
export async function test_api_seller_analytics_retrieve_all_sellers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve seller analytics data
  const analytics =
    await api.functional.shoppingMall.admin.analytics.sellers.getSellerAnalytics(
      adminConnection,
    );
  typia.assert(analytics);
  // Note: The SDK returns IShoppingMallSellerAnalytic (singular), but the endpoint
  // path suggests it should return an array. The actual response type will be
  // validated by typia.assert() above.
  // 3. Handle both array and single object responses
  const sellers = Array.isArray(analytics) ? analytics : [analytics];
  // 4. Validate each seller analytics object
  await ArrayUtil.asyncForEach(sellers, async (seller, index) => {
    // Validate required fields exist
    TestValidator.predicate(
      `seller[${index}] has id`,
      typeof seller.id === "string",
    );
    TestValidator.predicate(
      `seller[${index}] has shopName`,
      typeof seller.shopName === "string",
    );
    TestValidator.predicate(
      `seller[${index}] has approvalStatus`,
      typeof seller.approvalStatus === "string",
    );
    TestValidator.predicate(
      `seller[${index}] has productCount`,
      typeof seller.productCount === "number",
    );
    TestValidator.predicate(
      `seller[${index}] has totalOrderItems`,
      typeof seller.totalOrderItems === "number",
    );
    TestValidator.predicate(
      `seller[${index}] has createdAt`,
      typeof seller.createdAt === "string",
    );
    // Validate approvalStatus is one of the valid values
    const validStatuses = [
      "pending",
      "approved",
      "rejected",
      "suspended",
    ] as const;
    TestValidator.predicate(
      `seller[${index}] has valid approvalStatus`,
      validStatuses.includes(
        seller.approvalStatus as (typeof validStatuses)[number],
      ),
    );
    // Validate productCount is non-negative
    TestValidator.predicate(
      `seller[${index}] productCount is non-negative`,
      seller.productCount >= 0,
    );
    // Validate totalOrderItems is non-negative
    TestValidator.predicate(
      `seller[${index}] totalOrderItems is non-negative`,
      seller.totalOrderItems >= 0,
    );
    // Validate rate fields (null for sellers with no orders, or 0-100 for those with orders)
    if (seller.shipmentCompletionRate !== undefined) {
      TestValidator.predicate(
        `seller[${index}] shipmentCompletionRate is null or in range 0-100`,
        seller.shipmentCompletionRate === null ||
          (seller.shipmentCompletionRate >= 0 &&
            seller.shipmentCompletionRate <= 100),
      );
    }
    if (seller.cancellationRate !== undefined) {
      TestValidator.predicate(
        `seller[${index}] cancellationRate is null or in range 0-100`,
        seller.cancellationRate === null ||
          (seller.cancellationRate >= 0 && seller.cancellationRate <= 100),
      );
    }
    if (seller.refundRate !== undefined) {
      TestValidator.predicate(
        `seller[${index}] refundRate is null or in range 0-100`,
        seller.refundRate === null ||
          (seller.refundRate >= 0 && seller.refundRate <= 100),
      );
    }
    // Validate createdAt is a valid date-time string
    TestValidator.predicate(
      `seller[${index}] createdAt is valid date-time`,
      !isNaN(Date.parse(seller.createdAt)),
    );
    // Validate ID is a valid UUID format
    TestValidator.predicate(
      `seller[${index}] has valid UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        seller.id,
      ),
    );
  });
  // 5. Validate sorting by creation date (newest first) if multiple sellers
  if (sellers.length > 1) {
    for (let i = 0; i < sellers.length - 1; i++) {
      const current = new Date(sellers[i].createdAt).getTime();
      const next = new Date(sellers[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `seller[${i}] created before seller[${i + 1}] (descending order)`,
        current >= next,
      );
    }
  }
}
