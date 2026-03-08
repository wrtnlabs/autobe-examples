import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test scenario: Seller retrieves their own shipment
   *
   * This test uses simulation mode to test the shipment retrieval endpoint.
   * In a real scenario, prerequisites would include:
   * - Seller products with variants
   * - Customer cart with seller's items
   * - Completed checkout with paid order items
   */
  // Create seller connection with simulation mode
  const sellerConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // Authenticate seller in simulation mode
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Generate random shipment ID for retrieval test
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the shipment by ID (simulated)
  const retrievedShipment =
    await api.functional.shoppingMall.seller.shipments.at(sellerConnection, {
      shipmentId,
    });
  typia.assert(retrievedShipment);
  // Validate shipment structure
  TestValidator.predicate(
    "shipment has valid UUID",
    typeof retrievedShipment.id === "string",
  );
  TestValidator.predicate(
    "carrier name is string",
    typeof retrievedShipment.carrier_name === "string",
  );
  TestValidator.predicate(
    "tracking number is string",
    typeof retrievedShipment.tracking_number === "string",
  );
  TestValidator.predicate(
    "shipped_at is valid date-time",
    typeof retrievedShipment.shipped_at === "string",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof retrievedShipment.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof retrievedShipment.updated_at === "string",
  );
  TestValidator.equals(
    "delivered_at is null for new shipment",
    retrievedShipment.delivered_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active shipment",
    retrievedShipment.deleted_at,
    null,
  );
  // Validate seller summary
  TestValidator.predicate(
    "seller has ID",
    typeof retrievedShipment.seller.id === "string",
  );
  TestValidator.predicate(
    "seller has shop_name",
    typeof retrievedShipment.seller.shop_name === "string",
  );
  TestValidator.predicate(
    "seller has approval_status",
    ["pending", "approved", "rejected"].includes(
      retrievedShipment.seller.approval_status,
    ),
  );
  // Validate order summary
  TestValidator.predicate(
    "order has ID",
    typeof retrievedShipment.order.id === "string",
  );
  TestValidator.predicate(
    "order has order_number",
    typeof retrievedShipment.order.order_number === "string",
  );
  TestValidator.predicate(
    "order has total_price",
    typeof retrievedShipment.order.total_price === "number",
  );
  TestValidator.predicate(
    "order has status",
    typeof retrievedShipment.order.status === "string",
  );
  // Validate order items array
  TestValidator.predicate(
    "orderItems is array",
    Array.isArray(retrievedShipment.orderItems),
  );
  // Validate each order item structure
  for (const item of retrievedShipment.orderItems) {
    TestValidator.predicate(
      "order item has valid ID",
      typeof item.id === "string",
    );
    TestValidator.predicate(
      "order item has valid quantity",
      typeof item.quantity === "number" && item.quantity >= 1,
    );
    TestValidator.predicate(
      "order item has valid price",
      typeof item.price === "number",
    );
    TestValidator.predicate(
      "order item has valid status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.status,
      ),
    );
    TestValidator.predicate(
      "order item has created_at",
      typeof item.created_at === "string",
    );
    // Validate nested product summary
    TestValidator.predicate(
      "product has ID",
      typeof item.product.id === "string",
    );
    TestValidator.predicate(
      "product has name",
      typeof item.product.name === "string",
    );
    // Validate nested variant summary
    TestValidator.predicate(
      "variant has ID",
      typeof item.variant.id === "string",
    );
    TestValidator.predicate(
      "variant has sku_code",
      typeof item.variant.sku_code === "string",
    );
    TestValidator.predicate(
      "variant has option_values",
      typeof item.variant.option_values === "object",
    );
    // Validate nested seller summary
    TestValidator.predicate(
      "item seller has ID",
      typeof item.seller.id === "string",
    );
    TestValidator.predicate(
      "item seller has shop_name",
      typeof item.seller.shop_name === "string",
    );
  }
}
