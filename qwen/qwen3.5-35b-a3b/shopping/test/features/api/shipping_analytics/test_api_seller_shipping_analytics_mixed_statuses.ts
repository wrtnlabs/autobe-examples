import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShippingAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipping_analytics_mixed_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  // Note: This test validates analytics calculation logic with existing database data
  // since customer/order/shipment creation APIs are not available in the SDK
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/seller/join",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller connection with JWT token for authenticated API calls
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  sellerAuthConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 3. Fetch shipping analytics - validates calculation logic for mixed statuses
  const analytics =
    await api.functional.ecommerceMall.seller.analytics.shipping.at(
      sellerAuthConnection,
    );
  typia.assert(analytics);
  // 4. Validate status breakdown structure - all 4 status keys must be present
  TestValidator.predicate(
    "status breakdown has created key",
    "created" in analytics.status_breakdown,
  );
  TestValidator.predicate(
    "status breakdown has inTransit key",
    "inTransit" in analytics.status_breakdown,
  );
  TestValidator.predicate(
    "status breakdown has delivered key",
    "delivered" in analytics.status_breakdown,
  );
  TestValidator.predicate(
    "status breakdown has cancelled key",
    "cancelled" in analytics.status_breakdown,
  );
  // 5. Validate business logic: status counts sum equals total shipments
  const statusSum =
    analytics.status_breakdown.created +
    analytics.status_breakdown.inTransit +
    analytics.status_breakdown.delivered +
    analytics.status_breakdown.cancelled;
  TestValidator.equals(
    "status counts sum equals total_shipments",
    statusSum,
    analytics.total_shipments,
  );
  // 6. Validate carrier distribution when shipments exist
  if (analytics.total_shipments > 0) {
    TestValidator.equals(
      "carrier distribution present when shipments exist",
      analytics.carrier_distribution.length > 0,
      true,
    );
    // Each carrier must have count >= 1
    for (const carrier of analytics.carrier_distribution) {
      TestValidator.predicate(
        `carrier ${carrier.carrier} has count >= 1`,
        carrier.count >= 1,
      );
    }
  }
  // 7. Validate delivery success rate is valid percentage (0-100) or null
  if (analytics.delivery_success_rate !== null) {
    TestValidator.predicate(
      "delivery success rate between 0 and 100",
      analytics.delivery_success_rate >= 0 &&
        analytics.delivery_success_rate <= 100,
    );
  }
  // 8. Validate average delivery time is null when no delivered shipments
  if (analytics.status_breakdown.delivered === 0) {
    TestValidator.equals(
      "avg delivery time null when no deliveries",
      analytics.average_delivery_time_days,
      null,
    );
  } else {
    // When there are deliveries, average time should be a valid number
    TestValidator.predicate(
      "avg delivery time is valid number when deliveries exist",
      analytics.average_delivery_time_days !== null &&
        typeof analytics.average_delivery_time_days === "number",
    );
  }
  // 9. Validate total items shipped is non-negative integer
  TestValidator.predicate(
    "total items shipped is non-negative",
    analytics.total_items_shipped >= 0,
  );
  // 10. Validate total items shipped matches expectation when shipments exist
  if (analytics.total_shipments > 0) {
    TestValidator.predicate(
      "total items shipped > 0 when shipments exist",
      analytics.total_items_shipped > 0,
    );
  } else {
    TestValidator.equals(
      "total items shipped is 0 when no shipments",
      analytics.total_items_shipped,
      0,
    );
  }
}
