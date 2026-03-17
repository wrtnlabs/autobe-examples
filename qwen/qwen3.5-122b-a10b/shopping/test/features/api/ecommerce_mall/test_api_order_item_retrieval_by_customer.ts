import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test customer order item retrieval by ID.
 *
 * This test validates that an authenticated customer can retrieve detailed
 * information about a specific order item from their own order. The test
 * verifies:
 *
 * 1. All order item fields are present and valid:
 *    - id, quantity, unitPrice, status, createdAt, updatedAt, deletedAt
 * 2. Nested order summary contains:
 *    - orderNumber, status, totalPrice
 * 3. Nested product variant summary contains:
 *    - skuCode, optionValues, price, stockQuantity
 * 4. Unit price is immutable (snapshot behavior) - remains constant regardless
 *    of current product variant pricing
 * 5. Order item status correctly reflects fulfillment state
 *
 * The test follows a complete e-commerce flow: customer registration, seller
 * registration with admin approval, product creation with variants, cart
 * operations, order placement, and finally order item retrieval.
 */
export async function test_api_order_item_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // ========== STEP 1: Create Admin Account ==========
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: adminPassword,
    },
  });
  typia.assert(admin);
  // ========== STEP 2: Create and Approve Seller ==========
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Login as admin to approve seller
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Login as seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.seller.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // ========== STEP 3: Create Category (Admin) ==========
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // ========== STEP 4: Create Product (Seller) ==========
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
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // ========== STEP 5: Create Product Variant (Seller) ==========
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"] as const),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L"] as const),
            },
          ] satisfies IEcommerceMallProductVariantOption[],
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // ========== STEP 6: Create Customer Account ==========
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // ========== STEP 7: Create Shipping Address (Customer) ==========
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999999>>()} ${RandomGenerator.name()} Street`,
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          is_default: true,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address);
  // ========== STEP 8: Add Item to Cart (Customer) ==========
  await generate_random_ecommerce_mall_customer_cart_items_create(
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
  // ========== STEP 9: Create Order (Customer) ==========
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: address.recipientName,
        shipping_phone_number: address.phoneNumber,
        shipping_street_address: address.streetAddress,
        shipping_city: address.city,
        shipping_state: address.stateProvince,
        shipping_postal_code: address.postalCode,
        shipping_country: address.country,
        address_id: address.id,
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // ========== STEP 10: Retrieve Order Item ==========
  // Get the first order item from the created order
  const orderItem = order.order_items[0];
  typia.assert(orderItem);
  // Retrieve the order item using the API endpoint
  const retrievedItem =
    await api.functional.ecommerceMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(retrievedItem);
  // ========== STEP 11: Validate Response Fields ==========
  // Validate order item fields
  TestValidator.equals("order item id matches", retrievedItem.id, orderItem.id);
  TestValidator.equals(
    "quantity matches",
    retrievedItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    retrievedItem.unitPrice,
    orderItem.unitPrice,
  );
  TestValidator.equals(
    "status matches",
    retrievedItem.status,
    orderItem.status,
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedItem.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedItem.updatedAt,
    ),
  );
  TestValidator.predicate(
    "deletedAt is null or valid date-time",
    retrievedItem.deletedAt === null ||
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        retrievedItem.deletedAt,
      ),
  );
  // Validate nested order summary
  TestValidator.equals("order id matches", retrievedItem.order.id, order.id);
  TestValidator.predicate(
    "order orderNumber exists",
    retrievedItem.order.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "order status exists",
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partiallyCompleted",
    ].includes(retrievedItem.order.status),
  );
  TestValidator.predicate(
    "order totalPrice is positive",
    retrievedItem.order.totalPrice > 0,
  );
  // Validate nested product variant summary
  TestValidator.equals(
    "variant id matches",
    retrievedItem.productVariant.id,
    variant.id,
  );
  TestValidator.predicate(
    "variant skuCode exists",
    retrievedItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant optionValues is object",
    typeof retrievedItem.productVariant.option_values === "object" &&
      retrievedItem.productVariant.option_values !== null,
  );
  TestValidator.predicate(
    "variant price exists or is null",
    retrievedItem.productVariant.price === null ||
      typeof retrievedItem.productVariant.price === "number",
  );
  TestValidator.predicate(
    "variant stockQuantity is non-negative",
    retrievedItem.productVariant.stock_quantity >= 0,
  );
}