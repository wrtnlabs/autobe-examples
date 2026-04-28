import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Tests seller fulfillment filtering by order lifecycle status.
 *
 * Authenticates a seller account and validates that the fulfillment endpoint correctly filters orders by status. Verifies that only orders matching the specified status are returned, while orders with different statuses are excluded. Tests multiple status values (shipped, delivered, cancelled) to ensure consistent filtering behavior across different order states.
 *
 * 1. Authenticates seller account with join endpoint
 * 2. Filters fulfillment by status='shipped' and validates only shipped orders are returned
 * 3. Filters fulfillment by status='delivered' and validates only delivered orders are returned
 * 4. Filters fulfillment by status='cancelled' and validates only cancelled orders are returned
 */
export async function test_api_seller_fulfillment_filter_by_status(
  connection: api.IConnection,
) {
  // 1. Authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/register",
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  // 2. Filter by status='shipped'
  const shippedBody = {
    status: "shipped",
  } satisfies IEcommercePlatformOrder.IFulfillmentRequest;
  const shippedResponse =
    await api.functional.ecommercePlatform.seller.orders.fulfillment.index(
      sellerConnection,
      { body: shippedBody },
    );
  typia.assert(shippedResponse);
  TestValidator.predicate(
    "all orders have shipped status",
    shippedResponse.data.every((order) => order.status === "shipped"),
  );
  // 3. Filter by status='delivered'
  const deliveredBody = {
    status: "delivered",
  } satisfies IEcommercePlatformOrder.IFulfillmentRequest;
  const deliveredResponse =
    await api.functional.ecommercePlatform.seller.orders.fulfillment.index(
      sellerConnection,
      { body: deliveredBody },
    );
  typia.assert(deliveredResponse);
  TestValidator.predicate(
    "all orders have delivered status",
    deliveredResponse.data.every((order) => order.status === "delivered"),
  );
  // 4. Filter by status='cancelled'
  const cancelledBody = {
    status: "cancelled",
  } satisfies IEcommercePlatformOrder.IFulfillmentRequest;
  const cancelledResponse =
    await api.functional.ecommercePlatform.seller.orders.fulfillment.index(
      sellerConnection,
      { body: cancelledBody },
    );
  typia.assert(cancelledResponse);
  TestValidator.predicate(
    "all orders have cancelled status",
    cancelledResponse.data.every((order) => order.status === "cancelled"),
  );
}
