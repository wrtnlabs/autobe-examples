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

export async function test_api_cart_items_sorting_and_price_filter(
  connection: api.IConnection,
): Promise<void> {
  // ===========================================
  // Setup Phase
  // ===========================================
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  // 2. Create seller account with stored password
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // 4. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 5. Create products with different prices
  // Note: Using placeholder category_id - in real test this would need valid category
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Budget Item Alpha",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 1000,
        category_id: categoryId,
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Premium Item Beta",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 5000,
        category_id: categoryId,
      },
    },
  );
  typia.assert(product2);
  const product3 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Luxury Item Gamma",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        category_id: categoryId,
      },
    },
  );
  typia.assert(product3);
  // 6. Create variants for each product with initial stock
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 1000,
          optionValues: [{ key: "color", value: "red" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 5000,
          optionValues: [{ key: "color", value: "blue" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product3.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 10000,
          optionValues: [{ key: "color", value: "gold" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant3);
  // 7. Customer adds cart items
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant1.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
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
  // ===========================================
  // Test Phase - Sorting
  // ===========================================
  // Test sort by created_at descending (newest first)
  const sortByCreatedDesc =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(sortByCreatedDesc);
  TestValidator.predicate(
    "sorted by created_at desc returns 3 items",
    sortByCreatedDesc.data.length === 3,
  );
  // Test sort by created_at ascending (oldest first)
  const sortByCreatedAsc =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(sortByCreatedAsc);
  TestValidator.equals(
    "oldest item first in asc sort",
    sortByCreatedAsc.data[0].id,
    cartItem1.id,
  );
  // Test sort by unit_price ascending (cheapest first)
  const sortByPriceAsc =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          sort: "unit_price",
          order: "asc",
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(sortByPriceAsc);
  TestValidator.equals(
    "cheapest item first in price asc sort",
    sortByPriceAsc.data[0].unit_price,
    1000,
  );
  TestValidator.equals(
    "most expensive item last in price asc sort",
    sortByPriceAsc.data[2].unit_price,
    10000,
  );
  // Test sort by unit_price descending (most expensive first)
  const sortByPriceDesc =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          sort: "unit_price",
          order: "desc",
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(sortByPriceDesc);
  TestValidator.equals(
    "most expensive item first in price desc sort",
    sortByPriceDesc.data[0].unit_price,
    10000,
  );
  TestValidator.equals(
    "cheapest item last in price desc sort",
    sortByPriceDesc.data[2].unit_price,
    1000,
  );
  // ===========================================
  // Test Phase - Price Range Filtering
  // ===========================================
  // Test min_price filter
  const filterByMinPrice =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          min_price: 3000,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(filterByMinPrice);
  TestValidator.predicate(
    "min_price filter excludes items below threshold",
    filterByMinPrice.data.every((item) => item.unit_price >= 3000),
  );
  TestValidator.equals(
    "min_price filter returns 2 items",
    filterByMinPrice.data.length,
    2,
  );
  // Test max_price filter
  const filterByMaxPrice =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          max_price: 6000,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(filterByMaxPrice);
  TestValidator.predicate(
    "max_price filter excludes items above threshold",
    filterByMaxPrice.data.every((item) => item.unit_price <= 6000),
  );
  TestValidator.equals(
    "max_price filter returns 2 items",
    filterByMaxPrice.data.length,
    2,
  );
  // Test both min_price and max_price
  const filterByPriceRange =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          min_price: 2000,
          max_price: 8000,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(filterByPriceRange);
  TestValidator.predicate(
    "price range filter returns items within range",
    filterByPriceRange.data.every(
      (item) => item.unit_price >= 2000 && item.unit_price <= 8000,
    ),
  );
  TestValidator.equals(
    "price range filter returns 1 item",
    filterByPriceRange.data.length,
    1,
  );
  // ===========================================
  // Test Phase - Pagination
  // ===========================================
  // Test pagination with limit
  const page1 = await api.functional.shoppingMall.customer.cart_items.index(
    customerConnection,
    {
      body: {
        limit: 2,
        page: 1,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has 2 items", page1.data.length, 2);
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 2", page1.pagination.limit, 2);
  TestValidator.equals("total records is 3", page1.pagination.records, 3);
  TestValidator.equals("total pages is 2", page1.pagination.pages, 2);
  // Test page 2
  const page2 = await api.functional.shoppingMall.customer.cart_items.index(
    customerConnection,
    {
      body: {
        limit: 2,
        page: 2,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 has 1 item", page2.data.length, 1);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  // ===========================================
  // Test Phase - Search
  // ===========================================
  // Test search by product name keyword
  const searchBudget =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          search: "Budget",
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(searchBudget);
  TestValidator.equals("search finds Budget item", searchBudget.data.length, 1);
  TestValidator.predicate(
    "search result contains Budget keyword",
    searchBudget.data[0].product.name.includes("Budget"),
  );
  // Test search with non-matching keyword
  const searchNonMatching =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          search: "NonExistentKeyword",
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(searchNonMatching);
  TestValidator.equals(
    "non-matching search returns empty",
    searchNonMatching.data.length,
    0,
  );
}
