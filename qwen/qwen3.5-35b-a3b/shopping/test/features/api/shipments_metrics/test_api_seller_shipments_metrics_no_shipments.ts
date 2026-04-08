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

export async function test_api_seller_shipments_metrics_no_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new seller with no shipment activity
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Verify seller account was created successfully
  TestValidator.predicate(
    "seller account created",
    seller.id !== undefined && seller.email !== undefined,
  );
  TestValidator.equals(
    "seller approval status is pending",
    seller.approval_status,
    "pending",
  );
  // 3. Call metrics endpoint for seller with no shipments
  const metrics: IEcommerceMallShipmentMetric =
    await api.functional.ecommerceMall.seller.shipments.metrics(
      sellerConnection,
    );
  typia.assert(metrics);
  // 4. Validate total shipments is zero
  TestValidator.equals("total_shipments is zero", metrics.total_shipments, 0);
  // 5. Validate status distribution shows zero counts
  TestValidator.equals(
    "status_distribution shipped count is zero",
    metrics.status_distribution.shipped,
    0,
  );
  TestValidator.equals(
    "status_distribution delivered count is zero",
    metrics.status_distribution.delivered,
    0,
  );
  // 6. Validate total items shipped is zero
  TestValidator.equals(
    "total_items_shipped is zero",
    metrics.total_items_shipped,
    0,
  );
  // 7. Validate delivery rate is zero (division by zero handled)
  TestValidator.equals(
    "delivery_rate is zero (division by zero handled)",
    metrics.delivery_rate,
    0,
  );
  // 8. Validate average delivery duration is null (no delivered shipments)
  TestValidator.equals(
    "average_delivery_duration_days is null (no data)",
    metrics.average_delivery_duration_days,
    null,
  );
  // 9. Validate average processing time is null (no shipments with shipped_at)
  TestValidator.equals(
    "average_processing_time_days is null (no data)",
    metrics.average_processing_time_days,
    null,
  );
  // 10. Verify delivery_rate is within valid 0-100 range
  TestValidator.predicate(
    "delivery_rate is within valid range 0-100",
    metrics.delivery_rate >= 0 && metrics.delivery_rate <= 100,
  );
  // 11. Verify seller has no shipments in the system (empty metrics)
  TestValidator.predicate(
    "seller has zero total shipments and zero items",
    metrics.total_shipments === 0 && metrics.total_items_shipped === 0,
  );
}
