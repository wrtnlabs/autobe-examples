import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_order_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates first variant
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        },
      },
    );
  typia.assert(variant1);
  // 4. Seller creates second variant
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        },
      },
    );
  typia.assert(variant2);
  // 5. Customer setup - create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 6. Customer adds first variant to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem1);
  // 7. Customer adds second variant to cart
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  // 8. Customer creates order from cart
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // 9. Retrieve order by ID
  const retrievedOrder = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(retrievedOrder);
  // 10. Validate order identification
  TestValidator.equals("order id matches", retrievedOrder.id, order.id);
  TestValidator.predicate(
    "order number exists",
    retrievedOrder.order_number.length > 0,
  );
  TestValidator.predicate(
    "ordered_at is valid date",
    new Date(retrievedOrder.ordered_at).getTime() > 0,
  );
  // 11. Validate shipping address snapshot
  TestValidator.predicate(
    "recipient name exists",
    retrievedOrder.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "recipient phone exists",
    retrievedOrder.recipient_phone.length > 0,
  );
  TestValidator.predicate(
    "street address exists",
    retrievedOrder.street_address.length > 0,
  );
  TestValidator.predicate("city exists", retrievedOrder.city.length > 0);
  TestValidator.predicate("state exists", retrievedOrder.state.length > 0);
  TestValidator.predicate(
    "postal code exists",
    retrievedOrder.postal_code.length > 0,
  );
  TestValidator.predicate("country exists", retrievedOrder.country.length > 0);
  // 12. Validate customer information
  TestValidator.equals(
    "customer id matches",
    retrievedOrder.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedOrder.customer.email,
    customerAuth.email,
  );
  // 13. Validate order items
  TestValidator.predicate(
    "has multiple order items",
    retrievedOrder.orderItems.length >= 2,
  );
  for (const orderItem of retrievedOrder.orderItems) {
    TestValidator.predicate(
      "order item quantity positive",
      orderItem.quantity > 0,
    );
    TestValidator.predicate("order item price positive", orderItem.price > 0);
    TestValidator.predicate(
      "order item status exists",
      orderItem.status.length > 0,
    );
    // Validate product summary (price range)
    TestValidator.predicate(
      "product min price valid",
      orderItem.product.min >= 0,
    );
    TestValidator.predicate(
      "product max price valid",
      orderItem.product.max >= 0,
    );
    // Validate variant snapshot
    TestValidator.predicate(
      "variant sku code exists",
      orderItem.productVariant.sku_code.length > 0,
    );
    // Validate seller snapshot
    TestValidator.predicate("seller id exists", orderItem.seller.id.length > 0);
    TestValidator.predicate(
      "seller email exists",
      orderItem.seller.email.length > 0,
    );
  }
  // 14. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date",
    new Date(retrievedOrder.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(retrievedOrder.updated_at).getTime() > 0,
  );
  // 15. Validate shipments array exists
  TestValidator.predicate(
    "shipments is array",
    Array.isArray(retrievedOrder.shipments),
  );
  // 16. Verify order belongs to authenticated customer
  TestValidator.equals(
    "order customer matches authenticated user",
    retrievedOrder.customer.id,
    customerAuth.id,
  );
}
