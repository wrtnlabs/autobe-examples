import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can filter order items by fulfillment status to efficiently track items through their workflow.
 *
 * This test authenticates as a seller and calls the order items endpoint with status='paid'
 * to retrieve only items awaiting shipment. It validates the response structure and confirms
 * that all returned items have status='paid' with shipment=null (not yet shipped).
 *
 * Valid status values: 'paid' (awaiting shipment), 'shipped' (in transit),
 * 'delivered' (received by customer), 'cancelled' (cancelled before shipment),
 * 'refunded' (refunded after delivery).
 */
export async function test_api_order_items_status_filter_paid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(),
      shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // Step 2: Call order items endpoint with status='paid' filter
  const result = await api.functional.shoppingMall.seller.order_items.index(
    sellerConnection,
    {
      body: {
        status: "paid",
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(result);
  // Step 3: Validate that all returned items have status='paid'
  TestValidator.predicate(
    "all items have status 'paid'",
    result.data.every((item) => item.status === "paid"),
  );
  // Step 4: Validate that all 'paid' items have null shipment (not yet shipped)
  TestValidator.predicate(
    "all 'paid' items have null shipment",
    result.data.every((item) => item.shipment === null),
  );
  // Step 5: Validate pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    result.pagination.current >= 0 &&
      result.pagination.limit >= 0 &&
      result.pagination.records >= 0 &&
      result.pagination.pages >= 0,
  );
}
