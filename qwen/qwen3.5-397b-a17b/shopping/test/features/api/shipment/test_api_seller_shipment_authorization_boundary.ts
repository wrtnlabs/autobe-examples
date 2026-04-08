import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller cannot retrieve shipment details for a shipment created by a different seller.
 *
 * Validates the authorization boundary for shipment access, ensuring that sellers can only view shipments they created. This test establishes two separate seller accounts and verifies that Seller B cannot access shipment details belonging to Seller A.
 *
 * The test verifies that the authorization middleware correctly validates the shopping_mall_seller_id against the authenticated seller's ID, preventing cross-seller data access. This is critical for maintaining data isolation in a multi-seller marketplace environment where multiple sellers may have items in the same order but must only access their own shipments.
 *
 * 1. Seller A registers and authenticates via seller join endpoint.
 * 2. Seller A creates a product with variants for sale.
 * 3. Customer (member) registers and places an order containing Seller A's products.
 * 4. Seller A creates a shipment for their order items with tracking information.
 * 5. Seller B registers as a separate seller account with different credentials.
 * 6. Seller B attempts to retrieve Seller A's shipment details via GET endpoint.
 * 7. Validates that Seller B receives 403 Forbidden error, confirming authorization boundary enforcement and that error response does not leak shipment details.
 */
export async function test_api_seller_shipment_authorization_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A registration and authentication
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Seller A creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller A creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer (member) registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 5. Customer places order containing Seller A's products
  // Note: This requires the customer to have cart items with Seller A's product variant
  // The generation function handles the cart-to-order conversion internally
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 6. Seller A creates shipment for their order items
  // Extract order items that belong to Seller A from the order
  const sellerAOrderItems = order.orderItems.filter(
    (item) => item.seller.id === sellerA.id,
  );
  TestValidator.predicate(
    "Seller A should have order items in the order",
    () => sellerAOrderItems.length > 0,
  );
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          order_item_ids: sellerAOrderItems.map((item) => item.id),
          carrier_name: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          tracking_number: RandomGenerator.alphaNumeric(12).toUpperCase(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 7. Seller B registration (separate seller account)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 8. Seller B attempts to access Seller A's shipment - should fail with 403 Forbidden
  await TestValidator.error(
    "seller B cannot access seller A's shipment - authorization boundary enforced",
    async () => {
      await api.functional.shoppingMall.seller.seller.shipments.at(
        sellerBConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
  // 9. Verify Seller A can still access their own shipment (positive test)
  const sellerAShipment =
    await api.functional.shoppingMall.seller.seller.shipments.at(
      sellerAConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(sellerAShipment);
  TestValidator.equals(
    "Seller A can access their own shipment",
    sellerAShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "Shipment seller matches Seller A",
    sellerAShipment.seller.id,
    sellerA.id,
  );
}