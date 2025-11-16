import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller order item search and filtering capabilities for efficient order
 * fulfillment workflows.
 *
 * This test validates that sellers can search their assigned order items using
 * product name or SKU code search, filter by price ranges, and sort by relevant
 * fields to prioritize fulfillment tasks. The test creates an order containing
 * multiple items from a seller with diverse product names, SKU codes, prices,
 * and quantities.
 *
 * Test workflow:
 *
 * 1. Create admin account and product categories
 * 2. Create seller account and multiple product listings with searchable
 *    attributes
 * 3. Create SKUs with unique codes and different price points
 * 4. Create buyer account, add items to cart, and place order
 * 5. Seller searches and filters their order items using various criteria
 * 6. Validate search accuracy, filter correctness, and sorting behavior
 */
export async function test_api_seller_order_items_fulfillment_search_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create product categories
  const categoryData = {
    name: "Electronics",
    slug: "electronics",
    description: "Electronic devices and accessories",
    display_order: 1,
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123456";
  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.content({ paragraphs: 1 }),
    store_name: RandomGenerator.name(2),
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create multiple products with diverse characteristics
  const products = await ArrayUtil.asyncMap(
    [
      {
        name: "Premium Wireless Headphones",
        price: 299.99,
        sku: "HEAD-BLK-001",
      },
      { name: "Budget USB Cable", price: 12.5, sku: "CABLE-WHT-002" },
      { name: "Deluxe Mechanical Keyboard", price: 189.0, sku: "KBD-RGB-003" },
      { name: "Wireless Mouse Pro", price: 79.99, sku: "MOUSE-BLK-004" },
      { name: "USB Hub 7-Port", price: 45.0, sku: "HUB-GRY-005" },
    ],
    async (productInfo) => {
      const saleData = {
        code: productInfo.sku,
        shopping_mall_category_id: category.id,
        title: productInfo.name,
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 30 as const,
      } satisfies IShoppingMallSale.ICreate;

      const sale = await api.functional.shoppingMall.seller.sales.create(
        connection,
        {
          body: saleData,
        },
      );
      typia.assert(sale);

      const skuData = {
        sku_code: productInfo.sku,
        variant_combination: "{}",
        base_price: productInfo.price,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate;

      const sku = await api.functional.shoppingMall.seller.sales.skus.create(
        connection,
        {
          saleCode: sale.code,
          body: skuData,
        },
      );
      typia.assert(sku);

      return { sale, sku };
    },
  );

  // Step 5: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = "buyer123456";
  const buyerData = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: RandomGenerator.name(),
    href: "https://buyer.example.com/join" as string & tags.Format<"uri">,
    referrer: "" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 6: Add all products to cart
  const cartItems = await ArrayUtil.asyncMap(products, async (product) => {
    const cartItemData = {
      shopping_mall_sale_sku_id: product.sku.id,
      quantity: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    } satisfies IShoppingMallCartItem.ICreate;

    const cartItem =
      await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
        connection,
        {
          body: cartItemData,
        },
      );
    typia.assert(cartItem);
    return cartItem;
  });

  // Step 7: Create delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: "United States",
    address_label: "Home",
    address_type: "residential",
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(address);

  // Step 8: Create payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "visa",
    last_four_digits: RandomGenerator.alphaNumeric(4),
    expiry_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    expiry_year: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2024>
    >(),
    billing_name: RandomGenerator.name(),
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(paymentMethod);

  // Step 9: Create order with all cart items
  const orderData = {
    cart_item_ids: cartItems.map((item) => item.id),
    buyer_address_id: address.id,
    payment_method_id: paymentMethod.id,
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: orderData,
    },
  );
  typia.assert(order);

  // Step 10: Switch to seller account
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 11: Test basic pagination without filters
  const allItems = await api.functional.shoppingMall.seller.orders.items.index(
    connection,
    {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(allItems);
  TestValidator.equals(
    "all items count matches order items",
    allItems.data.length,
    order.items.length,
  );

  // Step 12: Test search by product name (partial matching)
  const searchResult =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        search: "Wireless",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(searchResult);
  TestValidator.predicate(
    "search results contain wireless products",
    searchResult.data.every((item) =>
      item.product_name.toLowerCase().includes("wireless"),
    ),
  );

  // Step 13: Test search by SKU code
  const skuSearchResult =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        search: "HEAD",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(skuSearchResult);
  TestValidator.predicate(
    "SKU search finds matching items",
    skuSearchResult.data.some((item) => item.sku_code.includes("HEAD")),
  );

  // Step 14: Test price range filtering (high-value items)
  const highValueItems =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        min_price: 150,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(highValueItems);
  TestValidator.predicate(
    "all items meet minimum price",
    highValueItems.data.every((item) => item.unit_price >= 150),
  );

  // Step 15: Test sorting by quantity ascending
  const sortedByQuantityAsc =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "quantity",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortedByQuantityAsc);
  if (sortedByQuantityAsc.data.length > 1) {
    for (let i = 0; i < sortedByQuantityAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "items sorted by quantity ascending",
        sortedByQuantityAsc.data[i].quantity <=
          sortedByQuantityAsc.data[i + 1].quantity,
      );
    }
  }

  // Step 16: Test sorting by unit_price descending
  const sortedByPriceDesc =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "unit_price",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortedByPriceDesc);
  if (sortedByPriceDesc.data.length > 1) {
    for (let i = 0; i < sortedByPriceDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "items sorted by price descending",
        sortedByPriceDesc.data[i].unit_price >=
          sortedByPriceDesc.data[i + 1].unit_price,
      );
    }
  }

  // Step 17: Test combined search and filter
  const combinedSearch =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        search: "USB",
        max_price: 100,
        sort_by: "unit_price",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search filters correctly",
    combinedSearch.data.every(
      (item) =>
        (item.product_name.includes("USB") || item.sku_code.includes("USB")) &&
        item.unit_price <= 100,
    ),
  );
}
