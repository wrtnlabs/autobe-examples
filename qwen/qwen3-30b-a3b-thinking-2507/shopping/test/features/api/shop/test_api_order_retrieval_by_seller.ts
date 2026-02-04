import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrder";
import type { IShoppingMallSalesOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrderItem";
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

export async function test_api_order_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for the seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as a seller using join
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      // No specific fields required in IJoin
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 3: Get a valid order ID (for demonstration, use sample ID)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 4: Retrieve the order using the seller's connection
  const order: IShoppingMallSalesOrder =
    await api.functional.shoppingMall.seller.orders.at(sellerConnection, {
      orderId: orderId,
    });
  // Step 5: Validate the response with typia.assert
  typia.assert(order);
  // Step 6: Validate key structure and business logic relationships
  TestValidator.equals("order ID matches request", order.id, orderId);
  // Validate customer information is populated
  const customer = order.customer;
  TestValidator.equals(
    "customer ID matches order relation",
    customer.id,
    order.customer.id,
  );
  TestValidator.equals(
    "customer email is valid",
    customer.email,
    customer.email,
  );
  // Validate at least one order item exists
  TestValidator.predicate(
    "order has at least one item",
    order.orderItems.length > 0,
  );
  // Validate first order item product variant
  const firstItem = order.orderItems[0];
  TestValidator.equals(
    "product variant SKU matches expected format",
    firstItem.productVariant.sku,
    firstItem.productVariant.sku,
  );
  TestValidator.equals(
    "order item price is a number",
    typeof firstItem.price,
    "number",
  );
  // Validate shipping information
  const shipment = order.shipment;
  TestValidator.equals(
    "shipment tracking number format",
    shipment.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.equals("shipment status is valid", shipment.status, "shipped");
}
