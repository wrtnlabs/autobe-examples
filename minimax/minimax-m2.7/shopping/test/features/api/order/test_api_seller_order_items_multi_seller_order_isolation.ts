import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that when a single order contains items from multiple sellers, each seller
 * can only view and retrieve their own order items, not items from other sellers.
 *
 * This test validates the multi-seller order isolation feature of the e-commerce
 * platform. When a customer purchases products from multiple sellers in a single
 * order, each seller should only be able to access their own order items through
 * the seller dashboard endpoint.
 *
 * The test verifies:
 * 1. Both sellers can successfully retrieve their order items
 * 2. Each seller's response contains ONLY items belonging to their products
 * 3. Order items include frozen product snapshots at purchase time
 * 4. Order items include frozen seller profile snapshots at purchase time
 * 5. Both sellers see the same parent order number, confirming shared order context
 *
 * The isolation is critical for:
 * - Data privacy between sellers
 * - Preventing unauthorized access to competitor order data
 * - Accurate seller dashboard statistics
 *
 * 1. Register Seller A with unique credentials and create a product.
 * 2. Register Seller B with unique credentials and create a different product.
 * 3. Register a customer and add both products to their shopping cart.
 * 4. Checkout to create a single order containing items from both sellers.
 * 5. As Seller A, retrieve order items and validate only their items are returned.
 * 6. As Seller B, retrieve order items and validate only their items are returned.
 * 7. Verify both sellers see the same parent order number.
 * 8. Verify order items contain frozen product and seller profile snapshots.
 */
export async function test_api_seller_order_items_multi_seller_order_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {
    body: sellerACredentials,
  });
  typia.assert(sellerAAuthorized);
  // 2. Register and authenticate Seller B
  const sellerBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, {
    body: sellerBCredentials,
  });
  typia.assert(sellerBAuthorized);
  // 3. Create product for Seller A
  const productA =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(productA);
  // 4. Create product for Seller B
  const productB =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerBConnection,
      {},
    );
  typia.assert(productB);
  // 5. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  typia.assert(customerConnection);
  // 6. Add Seller A's product to cart
  const cartItemA =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: {
          variantId: productA.variants[0]!.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItemA);
  // 7. Add Seller B's product to cart
  const cartItemB =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: {
          variantId: productB.variants[0]!.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItemB);
  // 8. Checkout to create single order with items from both sellers
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Store the shared order number for validation
  const sharedOrderNumber = order.order_number;
  // 9. Retrieve order items as Seller A
  const sellerAOrderItemsPage =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.list(
      sellerAConnection,
    );
  typia.assert(sellerAOrderItemsPage);
  // 10. Retrieve order items as Seller B
  const sellerBOrderItemsPage =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.list(
      sellerBConnection,
    );
  typia.assert(sellerBOrderItemsPage);
  // 11. Validate Seller A sees ONLY their items
  TestValidator.equals(
    "Seller A order items count is 1",
    sellerAOrderItemsPage.data.length,
    1,
  );
  // Verify Seller A's item belongs to productA
  const sellerAOrderItem = sellerAOrderItemsPage.data[0]!;
  TestValidator.equals(
    "Seller A's item product matches productA",
    sellerAOrderItem.productSnapshot.productId,
    productA.id,
  );
  // Verify Seller A's item has frozen product snapshot with correct data
  TestValidator.equals(
    "Seller A's item product snapshot name matches",
    sellerAOrderItem.productSnapshot.name,
    productA.name,
  );
  // Verify Seller A's item has frozen seller profile snapshot
  TestValidator.predicate(
    "Seller A's item has seller profile snapshot",
    sellerAOrderItem.sellerProfileSnapshot !== null,
  );
  // Verify Seller A sees the shared order number
  TestValidator.equals(
    "Seller A sees the shared order number",
    sellerAOrderItem.order.order_number,
    sharedOrderNumber,
  );
  // 12. Validate Seller B sees ONLY their items
  TestValidator.equals(
    "Seller B order items count is 1",
    sellerBOrderItemsPage.data.length,
    1,
  );
  // Verify Seller B's item belongs to productB
  const sellerBOrderItem = sellerBOrderItemsPage.data[0]!;
  TestValidator.equals(
    "Seller B's item product matches productB",
    sellerBOrderItem.productSnapshot.productId,
    productB.id,
  );
  // Verify Seller B's item has frozen product snapshot with correct data
  TestValidator.equals(
    "Seller B's item product snapshot name matches",
    sellerBOrderItem.productSnapshot.name,
    productB.name,
  );
  // Verify Seller B's item has frozen seller profile snapshot
  TestValidator.predicate(
    "Seller B's item has seller profile snapshot",
    sellerBOrderItem.sellerProfileSnapshot !== null,
  );
  // Verify Seller B sees the shared order number
  TestValidator.equals(
    "Seller B sees the shared order number",
    sellerBOrderItem.order.order_number,
    sharedOrderNumber,
  );
  // 13. Validate isolation - Seller A's item does NOT belong to Seller B
  TestValidator.notEquals(
    "Seller A's item does NOT belong to productB",
    sellerAOrderItem.productSnapshot.productId,
    productB.id,
  );
  // 14. Validate isolation - Seller B's item does NOT belong to Seller A
  TestValidator.notEquals(
    "Seller B's item does NOT belong to productA",
    sellerBOrderItem.productSnapshot.productId,
    productA.id,
  );
  // 15. Validate total order has 2 items (both sellers' products)
  TestValidator.equals(
    "Total order items count is 2",
    order.orderItems.length,
    2,
  );
}
