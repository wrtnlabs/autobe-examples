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

export async function test_api_seller_shipping_analytics_no_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // Create authenticated seller connection using returned token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...sellerConnection.headers,
      Authorization: seller.token.access,
    },
  };
  // 2. Request shipping analytics for seller with zero shipments
  const analytics =
    await api.functional.ecommerceMall.seller.analytics.shipping.at(
      authenticatedSellerConnection,
    );
  typia.assert(analytics);
  // 3. Validate total_shipments is zero
  TestValidator.equals(
    "total shipments should be zero for new seller",
    analytics.total_shipments,
    0,
  );
  // 4. Validate status_breakdown has all zero counts
  TestValidator.equals(
    "created status count should be zero",
    analytics.status_breakdown.created,
    0,
  );
  TestValidator.equals(
    "inTransit status count should be zero",
    analytics.status_breakdown.inTransit,
    0,
  );
  TestValidator.equals(
    "delivered status count should be zero",
    analytics.status_breakdown.delivered,
    0,
  );
  TestValidator.equals(
    "cancelled status count should be zero",
    analytics.status_breakdown.cancelled,
    0,
  );
  // 5. Validate carrier_distribution is empty array (no carriers used)
  TestValidator.equals(
    "carrier distribution should be empty array",
    analytics.carrier_distribution.length,
    0,
  );
  // 6. Validate average_delivery_time_days is null (no delivered shipments)
  TestValidator.equals(
    "average delivery time should be null for zero shipments",
    analytics.average_delivery_time_days,
    null,
  );
  // 7. Validate delivery_success_rate is null (no data to calculate)
  TestValidator.equals(
    "delivery success rate should be null for zero shipments",
    analytics.delivery_success_rate,
    null,
  );
  // 8. Validate total_items_shipped is zero
  TestValidator.equals(
    "total items shipped should be zero",
    analytics.total_items_shipped,
    0,
  );
}
