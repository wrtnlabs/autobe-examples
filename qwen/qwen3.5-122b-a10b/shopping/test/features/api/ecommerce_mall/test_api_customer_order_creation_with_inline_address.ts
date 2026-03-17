import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_customer_order_creation_with_inline_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller setup - join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const sellerPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const sellerShopName = RandomGenerator.name();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: sellerShopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Admin creates category
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 4. Seller creates product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller creates variant with stock
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: typia.random<string & tags.Format<"uuid">>(),
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Customer setup - join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const customerPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 7. Customer adds variant to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 8. Customer creates order with inline shipping address (NOT using address_id)
  const inlineRecipientName = RandomGenerator.name();
  const inlinePhoneNumber = RandomGenerator.mobile();
  const inlineStreetAddress = RandomGenerator.paragraph({ sentences: 1 });
  const inlineCity = RandomGenerator.name();
  const inlineState = RandomGenerator.alphabets(2).toUpperCase();
  const inlinePostalCode = RandomGenerator.alphabets(5).toUpperCase();
  const inlineCountry = "South Korea";
  const order = await api.functional.ecommerceMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: inlineRecipientName,
        shipping_phone_number: inlinePhoneNumber,
        shipping_street_address: inlineStreetAddress,
        shipping_city: inlineCity,
        shipping_state: inlineState,
        shipping_postal_code: inlinePostalCode,
        shipping_country: inlineCountry,
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 9. Validate order contains the exact inline address provided
  TestValidator.equals(
    "recipient name matches",
    order.shipping_recipient_name,
    inlineRecipientName,
  );
  TestValidator.equals(
    "phone number matches",
    order.shipping_phone_number,
    inlinePhoneNumber,
  );
  TestValidator.equals(
    "street address matches",
    order.shipping_street_address,
    inlineStreetAddress,
  );
  TestValidator.equals("city matches", order.shipping_city, inlineCity);
  TestValidator.equals("state matches", order.shipping_state, inlineState);
  TestValidator.equals(
    "postal code matches",
    order.shipping_postal_code,
    inlinePostalCode,
  );
  TestValidator.equals(
    "country matches",
    order.shipping_country,
    inlineCountry,
  );
  // 10. Validate order has order items from cart
  TestValidator.predicate("order has items", order.order_items.length > 0);
  TestValidator.equals(
    "order item quantity matches cart",
    order.order_items[0].quantity,
    cartItem.items[0].quantity,
  );
  // 11. Validate order total is positive
  TestValidator.predicate("order total is positive", order.total_price > 0);
  // 12. Validate order has valid status
  TestValidator.predicate("order has status", order.status.length > 0);
  // 13. Validate cart is empty after order creation
  const cartAfterOrder =
    await api.functional.ecommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartAfterOrder);
  TestValidator.equals(
    "cart has only new item",
    cartAfterOrder.items.length,
    1,
  );
  TestValidator.equals(
    "new item quantity is 1",
    cartAfterOrder.items[0].quantity,
    1,
  );
}