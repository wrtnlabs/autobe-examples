import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_cart_stock_availability_indicators(
  connection: api.IConnection,
): Promise<void> {
  // Test cart display with items showing various stock availability indicators
  // Setup: Create seller, approve seller, create product with variants at different stock levels
  // Customer adds items to cart, retrieve cart list, validate availability_status computation
  // 1. Create admin and approve seller workflow
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // Login seller after approval
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create product (category_id is required - using random UUID as the system may have default categories)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        base_price: typia.random<number & tags.Minimum<1000>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 5. Create three variants with different stock scenarios
  // Variant 1: Will have sufficient stock (stock >= quantity)
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-SUFFICIENT-${RandomGenerator.alphaNumeric(6)}`,
          price: product.base_price,
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variant1);
  // Variant 2: Will have limited stock (0 < stock < quantity)
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-LIMITED-${RandomGenerator.alphaNumeric(6)}`,
          price: product.base_price,
          optionValues: [{ key: "color", value: "Blue" }],
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variant2);
  // Variant 3: Will have zero stock (out of stock)
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-OUT-${RandomGenerator.alphaNumeric(6)}`,
          price: product.base_price,
          optionValues: [{ key: "color", value: "Green" }],
          stockQuantity: 0,
        },
      },
    );
  typia.assert(variant3);
  // 6. Add inventory to create different stock scenarios
  // Variant 1: 100 units (sufficient for most cart quantities)
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerLoginConnection,
    {
      params: { variantId: variant1.id },
      body: {
        quantity: 100,
        reason: "Initial stock for sufficient stock test",
      },
    },
  );
  // Variant 2: 2 units (limited stock)
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerLoginConnection,
    {
      params: { variantId: variant2.id },
      body: {
        quantity: 2,
        reason: "Initial stock for limited stock test",
      },
    },
  );
  // Variant 3: 0 units - no inventory added (out of stock)
  // 7. Create customer and add items to cart
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  // 8. Add items to cart with different quantities
  // Item 1: Quantity 5 (stock 100 -> available)
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant1.id,
          quantity: 5,
        },
      },
    );
  typia.assert(cartItem1);
  // Item 2: Quantity 5 (stock 2 -> insufficient_stock)
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant2.id,
          quantity: 5,
        },
      },
    );
  typia.assert(cartItem2);
  // Item 3: Quantity 3 (stock 0 -> insufficient_stock)
  const cartItem3 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant3.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItem3);
  // 9. Retrieve cart list and validate availability indicators
  const cartList = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        availability_status: "all",
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(cartList);
  // 10. Validate cart items and their availability status
  TestValidator.equals("cart should have 3 items", cartList.data.length, 3);
  // Find each cart item by variant ID
  const item1 = cartList.data.find((item) => item.variant.id === variant1.id);
  const item2 = cartList.data.find((item) => item.variant.id === variant2.id);
  const item3 = cartList.data.find((item) => item.variant.id === variant3.id);
  // Validate item 1: available status
  TestValidator.predicate("item1 should exist", item1 !== undefined);
  if (item1 !== undefined) {
    TestValidator.equals(
      "item1 availability_status should be available",
      item1.availability_status,
      "available",
    );
    TestValidator.equals(
      "item1 current_stock should be 100",
      item1.current_stock,
      100,
    );
    TestValidator.predicate(
      "item1 subtotal should be positive",
      item1.subtotal > 0,
    );
  }
  // Validate item 2: insufficient_stock status
  TestValidator.predicate("item2 should exist", item2 !== undefined);
  if (item2 !== undefined) {
    TestValidator.equals(
      "item2 availability_status should be insufficient_stock",
      item2.availability_status,
      "insufficient_stock",
    );
    TestValidator.equals(
      "item2 current_stock should be 2",
      item2.current_stock,
      2,
    );
  }
  // Validate item 3: insufficient_stock status (0 stock < quantity)
  TestValidator.predicate("item3 should exist", item3 !== undefined);
  if (item3 !== undefined) {
    TestValidator.equals(
      "item3 availability_status should be insufficient_stock",
      item3.availability_status,
      "insufficient_stock",
    );
    TestValidator.equals(
      "item3 current_stock should be 0",
      item3.current_stock,
      0,
    );
  }
  // 11. Test stock_status filter
  const inStockItems = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        stock_status: "in_stock",
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(inStockItems);
  TestValidator.equals(
    "in_stock filter should return 1 item",
    inStockItems.data.length,
    1,
  );
  const insufficientStockItems =
    await api.functional.shoppingMall.customer.cart.index(customerConnection, {
      body: {
        stock_status: "insufficient_stock",
        limit: 10,
        page: 1,
      },
    });
  typia.assert(insufficientStockItems);
  TestValidator.equals(
    "insufficient_stock filter should return 2 items",
    insufficientStockItems.data.length,
    2,
  );
  // 12. Validate product and seller info in cart items
  if (item1 !== undefined) {
    TestValidator.predicate(
      "item1 should have product info",
      item1.product !== undefined,
    );
    TestValidator.predicate(
      "item1 should have seller info",
      item1.seller !== undefined,
    );
    TestValidator.equals(
      "item1 product name should match",
      item1.product.name,
      product.name,
    );
    TestValidator.equals(
      "item1 seller shop name should match",
      item1.seller.shopName,
      sellerAuth.shopName,
    );
  }
}
