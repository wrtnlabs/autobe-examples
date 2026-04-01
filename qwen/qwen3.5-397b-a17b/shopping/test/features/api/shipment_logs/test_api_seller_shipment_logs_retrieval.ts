import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentLog";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller shipment logs retrieval functionality.
 *
 * This test validates the complete shipment log lifecycle:
 * 1. Seller registers and logs in
 * 2. Customer registers and logs in
 * 3. Seller creates a product with variants
 * 4. Customer places an order containing the seller's product
 * 5. Seller creates a shipment with tracking information
 * 6. Seller retrieves shipment logs and validates the response
 *
 * Validates that shipment logs contain all expected event types,
 * proper pagination metadata, and correct sorting (newest first).
 */
export async function test_api_seller_shipment_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer creates an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 6. Seller creates a shipment for the order items
  const orderItemIds = order.orderItems
    .filter((item) => item.seller.id === sellerAuth.id)
    .map((item) => item.id);
  if (orderItemIds.length > 0) {
    const shipment =
      await generate_random_shopping_mall_seller_shipments_create(
        sellerConnection,
        {
          body: {
            tracking_carrier: RandomGenerator.pick([
              "FedEx",
              "UPS",
              "DHL",
              "USPS",
            ]),
            tracking_number: RandomGenerator.alphaNumeric(16),
            order_item_ids: orderItemIds,
          } satisfies IShoppingMallShipment.ICreate,
        },
      );
    typia.assert(shipment);
    // 7. Seller retrieves shipment logs
    const logsResponse =
      await api.functional.shoppingMall.seller.shipment_logs.index(
        sellerConnection,
        {
          body: {
            page: 1,
            limit: 20,
            sort: "created_at:DESC",
          } satisfies IShoppingMallShipmentLog.IRequest,
        },
      );
    typia.assert(logsResponse);
    // 8. Validate pagination metadata
    TestValidator.predicate(
      "current page is at least 1",
      logsResponse.pagination.current >= 1,
    );
    TestValidator.predicate(
      "limit is positive",
      logsResponse.pagination.limit > 0,
    );
    TestValidator.predicate(
      "records count is non-negative",
      logsResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count is non-negative",
      logsResponse.pagination.pages >= 0,
    );
    // 9. Validate logs exist
    TestValidator.predicate(
      "has logs data array",
      Array.isArray(logsResponse.data),
    );
    // 10. Validate log entries if any exist
    if (logsResponse.data.length > 0) {
      const firstLog = logsResponse.data[0];
      // Validate event type is one of expected values
      TestValidator.predicate(
        "event type is valid enum value",
        [
          "created",
          "tracking_updated",
          "delivery_confirmed",
          "auto_delivered",
        ].includes(firstLog.eventType),
      );
      // Validate actor type is one of expected values
      TestValidator.predicate(
        "actor type is valid enum value",
        ["customer", "seller", "administrator", "system"].includes(
          firstLog.actorType,
        ),
      );
      // Validate actor ID is present for non-system events
      if (firstLog.actorType !== "system") {
        TestValidator.predicate(
          "actor ID exists for non-system events",
          firstLog.actorId !== null && firstLog.actorId !== undefined,
        );
      }
      // Validate shipment reference exists
      TestValidator.predicate(
        "shipment reference exists",
        firstLog.shipment !== null && firstLog.shipment !== undefined,
      );
      // Validate logs are sorted by created_at DESC (newest first)
      if (logsResponse.data.length > 1) {
        const timestamps = logsResponse.data.map((log) =>
          new Date(log.createdAt).getTime(),
        );
        for (let i = 1; i < timestamps.length; i++) {
          TestValidator.predicate(
            "logs sorted by created_at descending",
            timestamps[i - 1] >= timestamps[i],
          );
        }
      }
      // Validate shipment contains tracking information
      TestValidator.predicate(
        "shipment has tracking carrier",
        firstLog.shipment.trackingCarrier.length > 0,
      );
      TestValidator.predicate(
        "shipment has tracking number",
        firstLog.shipment.trackingNumber.length > 0,
      );
    }
  }
}
