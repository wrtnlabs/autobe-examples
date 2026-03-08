import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAnalytic";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_carts_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_shipping_analytics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;
  // 2. Seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerLogin);
  // 3. Customer setup - register and login
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerJoin);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerJoin.email,
        password: customerPassword,
      },
    },
  );
  typia.assert(customerLogin);
  // 4. Request shipping analytics
  const analytics =
    await api.functional.ecommerceMall.seller.analytics.shipping.at(
      sellerLoginConnection,
    );
  typia.assert(analytics);
  // 5. Validate response structure
  TestValidator.predicate(
    "total_shipments is non-negative",
    analytics.total_shipments >= 0,
  );
  TestValidator.predicate(
    "status_breakdown.created exists",
    analytics.status_breakdown.created !== undefined,
  );
  TestValidator.predicate(
    "status_breakdown.inTransit exists",
    analytics.status_breakdown.inTransit !== undefined,
  );
  TestValidator.predicate(
    "status_breakdown.delivered exists",
    analytics.status_breakdown.delivered !== undefined,
  );
  TestValidator.predicate(
    "status_breakdown.cancelled exists",
    analytics.status_breakdown.cancelled !== undefined,
  );
  TestValidator.predicate(
    "carrier_distribution is array",
    Array.isArray(analytics.carrier_distribution),
  );
  TestValidator.predicate(
    "carrier_distribution entries have carrier",
    analytics.carrier_distribution.every((c) => c.carrier !== undefined),
  );
  TestValidator.predicate(
    "carrier_distribution entries have count",
    analytics.carrier_distribution.every((c) => c.count !== undefined),
  );
  TestValidator.predicate(
    "average_delivery_time_days is number or null",
    analytics.average_delivery_time_days === null ||
      typeof analytics.average_delivery_time_days === "number",
  );
  TestValidator.predicate(
    "delivery_success_rate is number or null",
    analytics.delivery_success_rate === null ||
      typeof analytics.delivery_success_rate === "number",
  );
  TestValidator.predicate(
    "total_items_shipped is non-negative",
    analytics.total_items_shipped >= 0,
  );
  // 6. Validate business logic calculations
  const statusSum =
    analytics.status_breakdown.created +
    analytics.status_breakdown.inTransit +
    analytics.status_breakdown.delivered +
    analytics.status_breakdown.cancelled;
  TestValidator.equals(
    "total_shipments equals sum of status breakdown",
    analytics.total_shipments,
    statusSum,
  );
  if (
    analytics.total_shipments > 0 &&
    analytics.delivery_success_rate !== null
  ) {
    const expectedSuccessRate =
      (analytics.status_breakdown.delivered / analytics.total_shipments) * 100;
    TestValidator.equals(
      "delivery_success_rate matches calculation",
      analytics.delivery_success_rate,
      expectedSuccessRate,
    );
  }
  if (analytics.carrier_distribution.length > 0) {
    const carrierTotal = analytics.carrier_distribution.reduce(
      (sum, c) => sum + c.count,
      0,
    );
    TestValidator.equals(
      "carrier distribution sum matches total shipments",
      carrierTotal,
      analytics.total_shipments,
    );
  }
}
