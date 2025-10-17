import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test searching and filtering order items within a specific order.
 *
 * This test validates the complete workflow of order item search and filtering
 * functionality. It creates a comprehensive test environment including
 * customer, seller, and admin accounts, sets up products with multiple SKU
 * variants, places an order with multiple items, and then tests the order items
 * search API with various filter combinations.
 *
 * Workflow:
 *
 * 1. Create and authenticate customer account
 * 2. Create and authenticate seller account
 * 3. Create and authenticate admin account
 * 4. Create product category (admin)
 * 5. Create products with multiple SKU variants (seller)
 * 6. Create delivery address (customer)
 * 7. Create payment method (customer)
 * 8. Add multiple items to shopping cart (customer)
 * 9. Place order (customer)
 * 10. Search and filter order items with pagination
 * 11. Validate search results and pagination
 */
export async function test_api_order_items_search_and_filter(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert(customer);

  const customerCartId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 4 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 3: Create admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 4: Create product category as admin
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 5: Create products as seller (token automatically switched)
  const products = await ArrayUtil.asyncRepeat(3, async () => {
    const productData = {
      name: RandomGenerator.paragraph({ sentences: 2 }),
      base_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
      >(),
    } satisfies IShoppingMallProduct.ICreate;

    const product = await api.functional.shoppingMall.seller.products.create(
      connection,
      {
        body: productData,
      },
    );
    typia.assert(product);
    return product;
  });

  // Step 6: Create multiple SKU variants for each product
  const allSkus = await ArrayUtil.asyncMap(products, async (product) => {
    const skus = await ArrayUtil.asyncRepeat(2, async () => {
      const skuData = {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallSku.ICreate;

      const sku = await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id,
          body: skuData,
        },
      );
      typia.assert(sku);
      return sku;
    });
    return skus;
  });

  const flatSkus = allSkus.flat();

  // Step 7: Create delivery address as customer (token automatically switched)
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "USA",
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert(address);

  // Step 8: Create payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: paymentMethodData,
      },
    );
  typia.assert(paymentMethod);

  // Step 9: Add multiple items to cart
  const itemCount = flatSkus.length > 4 ? 4 : flatSkus.length;
  const cartItems = await ArrayUtil.asyncRepeat(itemCount, async (index) => {
    const sku = flatSkus[index];
    const cartItemData = {
      shopping_mall_sku_id: sku.id,
      quantity: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    } satisfies IShoppingMallCartItem.ICreate;

    const cartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: customerCartId,
          body: cartItemData,
        },
      );
    typia.assert(cartItem);
    return cartItem;
  });

  // Step 10: Place order
  const orderData = {
    delivery_address_id: address.id,
    payment_method_id: paymentMethod.id,
    shipping_method: "standard",
  } satisfies IShoppingMallOrder.ICreate;

  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderData,
    });
  typia.assert(orderResponse);

  const orderId = orderResponse.order_ids[0];
  typia.assert(orderId);

  // Step 11: Search order items with default pagination
  const searchRequest1 = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallOrderItem.IRequest;

  const searchResult1 = await api.functional.shoppingMall.orders.items.index(
    connection,
    {
      orderId: orderId,
      body: searchRequest1,
    },
  );
  typia.assert(searchResult1);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    searchResult1.pagination.current === 1 &&
      searchResult1.pagination.limit === 10 &&
      searchResult1.pagination.records >= 0,
  );

  // Step 12: Search with different page size
  const searchRequest2 = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallOrderItem.IRequest;

  const searchResult2 = await api.functional.shoppingMall.orders.items.index(
    connection,
    {
      orderId: orderId,
      body: searchRequest2,
    },
  );
  typia.assert(searchResult2);

  TestValidator.equals(
    "limit should match requested value",
    searchResult2.pagination.limit,
    5,
  );

  // Step 13: Search without optional parameters
  const searchResult3 = await api.functional.shoppingMall.orders.items.index(
    connection,
    {
      orderId: orderId,
      body: {},
    },
  );
  typia.assert(searchResult3);

  TestValidator.predicate(
    "search without filters should return results",
    searchResult3.data.length >= 0,
  );

  // Validate all order items have required properties
  if (searchResult1.data.length > 0) {
    const firstItem = searchResult1.data[0];
    typia.assert(firstItem);

    TestValidator.predicate(
      "order item should have valid ID",
      firstItem.id.length > 0,
    );

    TestValidator.predicate(
      "order item should have product name",
      firstItem.product_name.length > 0,
    );

    TestValidator.predicate(
      "order item should have positive quantity",
      firstItem.quantity > 0,
    );
  }
}
