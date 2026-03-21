import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_seller_order_items_listing_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin and seller accounts
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      password: adminPassword as string & tags.Format<"password">,
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword as string & tags.Format<"password">,
    },
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create category, product, and variant
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price: product.base_price,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          option_values: [
            { key: "color", value: "red" },
            { key: "size", value: "large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // Step 3: Customer registers and adds item to cart
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      password: customerPassword as string & tags.Format<"password">,
    },
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await generate_random_ecommerce_mall_customer_customers_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postal_code: "12345",
        country: "Test Country",
        is_default: true,
      },
    },
  );
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  // Step 4: Customer completes checkout
  await api.functional.ecommerceMall.customer.checkout.prepare(
    customerConnection,
  );
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: `tok_${RandomGenerator.alphaNumeric(24)}`,
        },
      },
    );
  typia.assert(order);
  // Step 5: Seller retrieves order items with status filter
  const orderItemsResponse =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          status: ["paid"],
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(orderItemsResponse);
  // Step 6: Verify response contains paginated list of order items
  TestValidator.equals("has data", orderItemsResponse.data.length > 0, true);
  TestValidator.equals(
    "has pagination",
    orderItemsResponse.pagination !== null,
    true,
  );
  // Step 7: Verify each item belongs to the authenticated seller
  for (const item of orderItemsResponse.data) {
    TestValidator.equals(
      "order item belongs to seller",
      item.sellerProfileSnapshot.shop_name,
      product.seller.name,
    );
  }
  // Step 8: Verify response includes order item details
  const firstItem = orderItemsResponse.data[0];
  TestValidator.equals("has id", firstItem.id !== null, true);
  TestValidator.equals("has quantity", firstItem.quantity > 0, true);
  TestValidator.equals("has unit_price", firstItem.unit_price > 0, true);
  TestValidator.equals("has status", firstItem.status === "paid", true);
  TestValidator.equals(
    "subtotal equals quantity * unit_price",
    firstItem.quantity * firstItem.unit_price,
    firstItem.subtotal,
  );
  TestValidator.equals("has order summary", firstItem.order !== null, true);
  TestValidator.equals(
    "has product snapshot",
    firstItem.productSnapshot !== null,
    true,
  );
  TestValidator.equals(
    "has seller profile snapshot",
    firstItem.sellerProfileSnapshot !== null,
    true,
  );
  // Step 9: Verify pagination metadata
  TestValidator.equals(
    "pagination current is 1",
    orderItemsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    orderItemsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records > 0",
    orderItemsResponse.pagination.records > 0,
    true,
  );
  TestValidator.equals(
    "pagination pages >= 1",
    orderItemsResponse.pagination.pages >= 1,
    true,
  );
}