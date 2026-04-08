import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipmentMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipments_metrics_mixed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Call metrics endpoint
  const metrics =
    await api.functional.ecommerceMall.seller.shipments.metrics(
      sellerConnection,
    );
  typia.assert(metrics);
  // 3. Validate total_shipments
  TestValidator.predicate(
    "total_shipments is non-negative",
    metrics.total_shipments >= 0,
  );
  // 4. Validate status_distribution counts
  const { status_distribution } = metrics;
  TestValidator.predicate(
    "shipped count is non-negative",
    status_distribution.shipped >= 0,
  );
  TestValidator.predicate(
    "delivered count is non-negative",
    status_distribution.delivered >= 0,
  );
  // 5. Validate sum equals total
  const calculatedTotal =
    status_distribution.shipped + status_distribution.delivered;
  TestValidator.equals(
    "total_shipments equals sum of statuses",
    metrics.total_shipments,
    calculatedTotal,
  );
  // 6. Validate total_items_shipped
  TestValidator.predicate(
    "total_items_shipped is non-negative",
    metrics.total_items_shipped >= 0,
  );
  // 7. Validate delivery_rate is between 0 and 100
  TestValidator.predicate(
    "delivery_rate is non-negative",
    metrics.delivery_rate >= 0,
  );
  TestValidator.predicate(
    "delivery_rate is at most 100",
    metrics.delivery_rate <= 100,
  );
  // 8. Validate delivery_rate calculation
  if (metrics.total_shipments > 0) {
    const expectedRate =
      (status_distribution.delivered / metrics.total_shipments) * 100;
    TestValidator.predicate(
      "delivery_rate calculation is approximately correct",
      Math.abs(metrics.delivery_rate - expectedRate) < 0.01,
    );
  } else {
    TestValidator.equals(
      "delivery_rate is 0 when no shipments",
      metrics.delivery_rate,
      0,
    );
  }
  // 9. Validate average_delivery_duration_days
  TestValidator.predicate(
    "average_delivery_duration_days is null or non-negative",
    metrics.average_delivery_duration_days === null ||
      metrics.average_delivery_duration_days >= 0,
  );
  // 10. Validate average_processing_time_days
  TestValidator.predicate(
    "average_processing_time_days is null or non-negative",
    metrics.average_processing_time_days === null ||
      metrics.average_processing_time_days >= 0,
  );
}
