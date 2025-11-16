import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive shopping cart retrieval with filtering, searching,
 * sorting, and pagination.
 *
 * This test validates the complete cart search functionality for authenticated
 * buyers, ensuring proper filtering, sorting, and pagination capabilities work
 * correctly.
 *
 * Test workflow:
 *
 * 1. Create authenticated buyer, admin, and seller accounts
 * 2. Set up product categories for filtering tests
 * 3. Create multiple product listings across categories with varying prices
 * 4. Create SKU variants for products
 * 5. Populate buyer's cart with diverse items
 * 6. Test basic cart retrieval without filters
 * 7. Test pagination with different page/limit combinations
 * 8. Test search functionality with product name keywords
 * 9. Test category filtering (single and multiple)
 * 10. Test price range filtering (min, max, and combined)
 * 11. Test sorting options (date, price, name)
 * 12. Test combined filters (search + category + price + sort)
 * 13. Test edge cases (empty cart, no results)
 */
export async function test_api_cart_retrieval_with_filters(
  connection: api.IConnection,
) {
  // 1. Create authenticated buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // 2. Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Create product categories
  const categoryElectronics =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and gadgets",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryElectronics);

  const categoryClothing =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Clothing",
        slug: "clothing",
        description: "Apparel and fashion items",
        display_order: 2,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryClothing);

  const categoryHome =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Home & Garden",
        slug: "home-garden",
        description: "Home and garden products",
        display_order: 3,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryHome);

  // 4. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.content({ paragraphs: 1 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 5. Create product sales with varying prices
  const productPrices = [50, 100, 150, 250, 350, 500];
  const categories = [categoryElectronics, categoryClothing, categoryHome];

  const salesAndSkus: Array<{
    sale: IShoppingMallSale;
    sku: IShoppingMallSaleSku;
  }> = [];

  for (let i = 0; i < 6; i++) {
    const sale = await api.functional.shoppingMall.seller.sales.create(
      connection,
      {
        body: {
          code: `PRODUCT-${i + 1}-${RandomGenerator.alphaNumeric(6)}`,
          shopping_mall_category_id: categories[i % categories.length].id,
          title: `${categories[i % categories.length].name} Product ${i + 1}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          condition: "new",
          return_policy_days: 30,
        } satisfies IShoppingMallSale.ICreate,
      },
    );
    typia.assert(sale);

    const sku = await api.functional.shoppingMall.seller.sales.skus.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          sku_code: `SKU-${i + 1}-${RandomGenerator.alphaNumeric(4)}`,
          variant_combination: JSON.stringify({ Default: "Standard" }),
          base_price: productPrices[i],
          enabled: true,
        } satisfies IShoppingMallSaleSku.ICreate,
      },
    );
    typia.assert(sku);

    salesAndSkus.push({ sale, sku });
  }

  // 6. Switch to buyer and add items to cart
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const cartItems: IShoppingMallCartItem[] = [];
  for (const { sku } of salesAndSkus) {
    const cartItem =
      await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
        connection,
        {
          body: {
            shopping_mall_sale_sku_id: sku.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    typia.assert(cartItem);
    cartItems.push(cartItem);
  }

  // 7. Test basic cart retrieval without filters
  const allCartItems =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(allCartItems);
  TestValidator.predicate(
    "cart should contain all items",
    allCartItems.data.length >= 6,
  );

  // 8. Test pagination
  const page1 = await api.functional.shoppingMall.buyer.buyers.me.cart.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 should have 3 items", page1.data.length, 3);
  TestValidator.equals("current page should be 1", page1.pagination.current, 1);
  TestValidator.equals("limit should be 3", page1.pagination.limit, 3);

  const page2 = await api.functional.shoppingMall.buyer.buyers.me.cart.index(
    connection,
    {
      body: {
        page: 2,
        limit: 3,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 should be 2", page2.pagination.current, 2);

  // 9. Test search functionality
  const firstItem = allCartItems.data[0];
  if (firstItem) {
    typia.assertGuard(firstItem!);
    const productTitle = firstItem.sku.sale.title;

    const searchResults =
      await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
        body: {
          search: productTitle,
        } satisfies IShoppingMallCartItem.IRequest,
      });
    typia.assert(searchResults);
    TestValidator.predicate(
      "search should find matching items",
      searchResults.data.length > 0,
    );
  }

  // 10. Test category filtering
  const electronicsItems =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        category_ids: [categoryElectronics.id],
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(electronicsItems);
  TestValidator.predicate(
    "should filter by electronics category",
    electronicsItems.data.length >= 1,
  );

  // 11. Test multiple category filtering
  const multiCategoryItems =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        category_ids: [categoryElectronics.id, categoryClothing.id],
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(multiCategoryItems);
  TestValidator.predicate(
    "should filter by multiple categories",
    multiCategoryItems.data.length >= 2,
  );

  // 12. Test price range filtering - minimum price
  const minPriceItems =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        min_price: 200,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(minPriceItems);
  TestValidator.predicate(
    "all items should be >= min_price",
    minPriceItems.data.every((item) => item.unit_price_snapshot >= 200),
  );

  // 13. Test price range filtering - maximum price
  const maxPriceItems =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        max_price: 200,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(maxPriceItems);
  TestValidator.predicate(
    "all items should be <= max_price",
    maxPriceItems.data.every((item) => item.unit_price_snapshot <= 200),
  );

  // 14. Test combined price range
  const priceRangeItems =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        min_price: 100,
        max_price: 300,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(priceRangeItems);
  TestValidator.predicate(
    "all items should be within price range",
    priceRangeItems.data.every(
      (item) =>
        item.unit_price_snapshot >= 100 && item.unit_price_snapshot <= 300,
    ),
  );

  // 15. Test sorting - price ascending
  const sortedByPriceAsc =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        sort_by: "price_asc",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(sortedByPriceAsc);
  if (sortedByPriceAsc.data.length > 1) {
    TestValidator.predicate(
      "items should be sorted by price ascending",
      sortedByPriceAsc.data[0].unit_price_snapshot <=
        sortedByPriceAsc.data[1].unit_price_snapshot,
    );
  }

  // 16. Test sorting - price descending
  const sortedByPriceDesc =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        sort_by: "price_desc",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(sortedByPriceDesc);
  if (sortedByPriceDesc.data.length > 1) {
    TestValidator.predicate(
      "items should be sorted by price descending",
      sortedByPriceDesc.data[0].unit_price_snapshot >=
        sortedByPriceDesc.data[1].unit_price_snapshot,
    );
  }

  // 17. Test sorting - name ascending
  const sortedByNameAsc =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        sort_by: "name_asc",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(sortedByNameAsc);

  // 18. Test sorting - name descending
  const sortedByNameDesc =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        sort_by: "name_desc",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(sortedByNameDesc);

  // 19. Test sorting - date added
  const sortedByDate =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        sort_by: "date_added",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(sortedByDate);

  // 20. Test combined filters - search + category + price range + sorting
  const combinedFilters =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        search: "Product",
        category_ids: [categoryElectronics.id],
        min_price: 50,
        max_price: 400,
        sort_by: "price_asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(combinedFilters);
  TestValidator.predicate(
    "combined filters should work correctly",
    combinedFilters.data.every(
      (item) =>
        item.unit_price_snapshot >= 50 && item.unit_price_snapshot <= 400,
    ),
  );

  // 21. Test empty result scenario - price range with no matches
  const noMatchResults =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        min_price: 10000,
        max_price: 20000,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(noMatchResults);
  TestValidator.equals(
    "no items should match high price range",
    noMatchResults.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination should be valid for empty results",
    noMatchResults.pagination.records === 0,
  );

  // 22. Test empty cart scenario with new buyer
  const newBuyerEmail = typia.random<string & tags.Format<"email">>();
  const newBuyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: newBuyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(newBuyer);

  const emptyCart =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(emptyCart);
  TestValidator.equals(
    "empty cart should return empty data array",
    emptyCart.data.length,
    0,
  );
  TestValidator.equals(
    "empty cart pagination records should be 0",
    emptyCart.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty cart pagination pages should be 0",
    emptyCart.pagination.pages,
    0,
  );

  // 23. Switch back to original buyer to test availability filtering
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // 24. Test availability status filtering
  const allStatusItems =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        availability_status: "all",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(allStatusItems);

  const inStockItems =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {
        availability_status: "in_stock",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(inStockItems);
}
