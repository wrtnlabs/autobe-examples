import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test administrator retrieval of order items from a multi-seller order with independent processing.
 *
 * Validates the multi-seller order workflow where items from different sellers are processed independently within a single order. The test creates two sellers, a customer, and a multi-seller order, then ships only one seller's items to demonstrate independent status tracking and the partially_completed order status derivation.
 *
 * Special attention is given to verifying that order items maintain independent status lifecycles (paid, shipped, delivered, cancelled, refunded) and that the parent order status correctly reflects the collective state of all items.
 *
 * 1. Administrator registers and authenticates to the system.
 * 2. Two seller accounts are created and authenticated (Seller A and Seller B).
 * 3. A customer account is created and authenticated.
 * 4. Seller A creates a product with a variant.
 * 5. Seller B creates a product with a variant.
 * 6. Customer adds both product variants to their shopping cart.
 * 7. Customer completes checkout, creating a multi-seller order with two order items.
 * 8. Seller A creates a shipment for their order item, changing its status to 'shipped'.
 * 9. Administrator retrieves Seller A's order item and verifies status is 'shipped'.
 * 10. Administrator verifies the order status is 'partially_completed' due to mixed item states.
 * 11. Administrator retrieves Seller B's order item and verifies status remains 'paid'.
 * 12. Both order items reference the same order_id and order_number.
 */
export async function test_api_order_item_multi_seller_order_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost/admin/login",
      referrer: "http://localhost",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Seller A setup - capture authorized response for seller ID
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: "1234",
      href: "http://localhost/seller/join",
      referrer: "http://localhost",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAAuth);
  // 3. Seller B setup - capture authorized response for seller ID
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: "1234",
      href: "http://localhost/seller/join",
      referrer: "http://localhost",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerBAuth);
  // 4. Customer setup - capture authorized response
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "1234",
      href: "http://localhost/customer/join",
      referrer: "http://localhost",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 5. Seller A creates product
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: "Seller A Product",
        description: "Product from Seller A",
        base_price: 10000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productA);
  // 6. Seller B creates product
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: "Seller B Product",
        description: "Product from Seller B",
        base_price: 15000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productB);
  // 7. Customer adds product A variant to cart
  const cartItemA =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: productA.variants[0].id,
          quantity: 1,
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(cartItemA);
  // 8. Customer adds product B variant to cart
  const cartItemB =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: productB.variants[0].id,
          quantity: 1,
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(cartItemB);
  // 9. Customer checkout to create multi-seller order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: "test_payment_token",
      } satisfies IShoppingMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // Identify order items from each seller using seller IDs from auth responses
  const orderItemA = order.items.find(
    (item) => item.seller.id === sellerAAuth.id,
  );
  const orderItemB = order.items.find(
    (item) => item.seller.id === sellerBAuth.id,
  );
  if (!orderItemA || !orderItemB) {
    throw new Error("Failed to find order items from both sellers");
  }
  // 10. Seller A ships their order item
  await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        carrier_name: "Test Carrier",
        tracking_number: "TRACK123456",
        order_item_ids: [orderItemA.id],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  // 11. Administrator retrieves Seller A's order item
  const retrievedOrderItemA =
    await api.functional.shoppingMall.administrator.order_items.at(
      adminConnection,
      {
        itemId: orderItemA.id,
      },
    );
  typia.assert(retrievedOrderItemA);
  // 12. Verify Seller A's order item status is 'shipped'
  TestValidator.equals(
    "Seller A order item status is shipped",
    retrievedOrderItemA.status,
    "shipped",
  );
  // 13. Verify Seller A's seller information
  TestValidator.equals(
    "Seller A seller ID matches",
    retrievedOrderItemA.seller.id,
    sellerAAuth.id,
  );
  // 14. Verify order status is partially_completed
  TestValidator.equals(
    "Order status is partially_completed",
    retrievedOrderItemA.order.status,
    "partially_completed",
  );
  // 15. Administrator retrieves Seller B's order item
  const retrievedOrderItemB =
    await api.functional.shoppingMall.administrator.order_items.at(
      adminConnection,
      {
        itemId: orderItemB.id,
      },
    );
  typia.assert(retrievedOrderItemB);
  // 16. Verify Seller B's order item status is 'paid'
  TestValidator.equals(
    "Seller B order item status is paid",
    retrievedOrderItemB.status,
    "paid",
  );
  // 17. Verify Seller B's seller information
  TestValidator.equals(
    "Seller B seller ID matches",
    retrievedOrderItemB.seller.id,
    sellerBAuth.id,
  );
  // 18. Verify both items reference the same order
  TestValidator.equals(
    "Both items reference same order ID",
    retrievedOrderItemA.order.id,
    retrievedOrderItemB.order.id,
  );
  TestValidator.equals(
    "Both items reference same order number",
    retrievedOrderItemA.order.order_number,
    retrievedOrderItemB.order.order_number,
  );
  // 19. Verify order status is partially_completed for both items
  TestValidator.equals(
    "Both items show partially_completed order status",
    retrievedOrderItemB.order.status,
    "partially_completed",
  );
}
