import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_dashboard_order_items_isolation_between_sellers(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first seller account with known password
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      password: seller1Password,
    },
  });
  typia.assert(seller1Auth);
  // Step 2: Create second seller account with known password
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      password: seller2Password,
    },
  });
  typia.assert(seller2Auth);
  // Step 3: Create product for first seller
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: `Seller1 Product ${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  // Step 4: Add inventory to first seller\'s product
  const variant1 = product1.variants[0];
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    seller1Connection,
    {
      params: { productId: product1.id, variantId: variant1.id },
      body: {
        operation: "restock",
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<5>>(),
        reason: "Initial stock",
      },
    },
  );
  // Step 5: Create product for second seller
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: `Seller2 Product ${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  // Step 6: Add inventory to second seller\'s product
  const variant2 = product2.variants[0];
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    seller2Connection,
    {
      params: { productId: product2.id, variantId: variant2.id },
      body: {
        operation: "restock",
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<5>>(),
        reason: "Initial stock",
      },
    },
  );
  // Step 7: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Step 8: Customer adds first seller\'s product to cart
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem1);
  // Step 9: Customer adds second seller\'s product to cart
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  // Step 10: Place combined order from both sellers
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: `mock_token_${RandomGenerator.alphaNumeric(16)}`,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Step 11: Login as first seller and query their dashboard order items
  const seller1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller1LoginConnection, {
    body: {
      email: seller1Auth.email,
      password: seller1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const seller1OrderItems =
    await api.functional.ecommerceMall.seller.dashboard.order_items.index(
      seller1LoginConnection,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(seller1OrderItems);
  // Step 12: Login as second seller and query their dashboard order items
  const seller2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller2LoginConnection, {
    body: {
      email: seller2Auth.email,
      password: seller2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const seller2OrderItems =
    await api.functional.ecommerceMall.seller.dashboard.order_items.index(
      seller2LoginConnection,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(seller2OrderItems);
  // Step 13: Validate seller 1 isolation - should only see product1\'s order item
  TestValidator.equals(
    "Seller1 has 1 order item",
    seller1OrderItems.data.length,
    1,
  );
  const seller1OrderItem = seller1OrderItems.data[0];
  TestValidator.equals(
    "Seller1 sees their own product",
    seller1OrderItem.productSnapshot.name,
    product1.name,
  );
  TestValidator.equals(
    "Seller1 sees order from combined checkout",
    seller1OrderItem.order.order_number,
    order.orderNumber,
  );
  // Step 14: Validate seller 2 isolation - should only see product2\'s order item
  TestValidator.equals(
    "Seller2 has 1 order item",
    seller2OrderItems.data.length,
    1,
  );
  const seller2OrderItem = seller2OrderItems.data[0];
  TestValidator.equals(
    "Seller2 sees their own product",
    seller2OrderItem.productSnapshot.name,
    product2.name,
  );
  TestValidator.equals(
    "Seller2 sees order from combined checkout",
    seller2OrderItem.order.order_number,
    order.orderNumber,
  );
  // Step 15: Validate seller 1 does NOT see seller 2\'s product
  const seller1ProductNames = seller1OrderItems.data.map(
    (item) => item.productSnapshot.name,
  );
  TestValidator.predicate(
    "Seller1 does not see Seller2\'s product",
    !seller1ProductNames.includes(product2.name),
  );
  // Step 16: Validate seller 2 does NOT see seller 1\'s product
  const seller2ProductNames = seller2OrderItems.data.map(
    (item) => item.productSnapshot.name,
  );
  TestValidator.predicate(
    "Seller2 does not see Seller1\'s product",
    !seller2ProductNames.includes(product1.name),
  );
  // Step 17: Validate product snapshots exist for dispute resolution
  TestValidator.predicate(
    "Seller1 order item has product snapshot",
    seller1OrderItem.productSnapshot.id !== undefined &&
      seller1OrderItem.productSnapshot.id !== null,
  );
  TestValidator.equals(
    "Seller1 product snapshot has product name",
    seller1OrderItem.productSnapshot.name,
    product1.name,
  );
  TestValidator.equals(
    "Seller1 product snapshot has base price",
    seller1OrderItem.productSnapshot.base_price,
    product1.base_price,
  );
  TestValidator.predicate(
    "Seller2 order item has product snapshot",
    seller2OrderItem.productSnapshot.id !== undefined &&
      seller2OrderItem.productSnapshot.id !== null,
  );
  TestValidator.equals(
    "Seller2 product snapshot has product name",
    seller2OrderItem.productSnapshot.name,
    product2.name,
  );
  TestValidator.equals(
    "Seller2 product snapshot has base price",
    seller2OrderItem.productSnapshot.base_price,
    product2.base_price,
  );
  // Step 18: Validate seller profile snapshots exist for dispute resolution
  TestValidator.predicate(
    "Seller1 order item has seller profile snapshot",
    seller1OrderItem.sellerProfileSnapshot.id !== undefined &&
      seller1OrderItem.sellerProfileSnapshot.id !== null,
  );
  TestValidator.predicate(
    "Seller1 seller profile snapshot has shop name",
    seller1OrderItem.sellerProfileSnapshot.shop_name !== undefined &&
      seller1OrderItem.sellerProfileSnapshot.shop_name !== null &&
      seller1OrderItem.sellerProfileSnapshot.shop_name.length > 0,
  );
  TestValidator.predicate(
    "Seller2 order item has seller profile snapshot",
    seller2OrderItem.sellerProfileSnapshot.id !== undefined &&
      seller2OrderItem.sellerProfileSnapshot.id !== null,
  );
  TestValidator.predicate(
    "Seller2 seller profile snapshot has shop name",
    seller2OrderItem.sellerProfileSnapshot.shop_name !== undefined &&
      seller2OrderItem.sellerProfileSnapshot.shop_name !== null &&
      seller2OrderItem.sellerProfileSnapshot.shop_name.length > 0,
  );
  // Step 19: Validate order items are from the same order
  TestValidator.equals(
    "Both sellers see same order id",
    seller1OrderItem.order.id,
    seller2OrderItem.order.id,
  );
}
