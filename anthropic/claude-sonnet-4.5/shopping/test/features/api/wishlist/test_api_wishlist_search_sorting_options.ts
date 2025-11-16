import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test wishlist sorting functionality across different sort fields and sort
 * orders.
 *
 * This test validates that buyers can organize their wishlist according to
 * their preferences using various sorting options. The test creates multiple
 * products with distinct characteristics (names, prices, creation times) and
 * verifies that the wishlist search API correctly orders results based on the
 * requested sort criteria.
 *
 * Workflow:
 *
 * 1. Set up multi-actor authentication (buyer, admin, seller)
 * 2. Create product infrastructure (category, multiple sales with varying names
 *    and prices)
 * 3. Create SKU variants with different prices for sorting tests
 * 4. Add multiple products to wishlist at different times
 * 5. Test sorting by created_at (ascending and descending)
 * 6. Test sorting by price (ascending and descending)
 * 7. Test sorting by product_name (ascending and descending)
 * 8. Verify default sorting behavior
 *
 * Business validations:
 *
 * - Buyers can view newest wishlist additions first (created_at desc)
 * - Buyers can identify oldest saved items (created_at asc)
 * - Buyers can prioritize by affordability (price asc)
 * - Buyers can organize alphabetically for easier browsing (product_name
 *   asc/desc)
 * - Sort options support different shopping strategies
 */
export async function test_api_wishlist_search_sorting_options(
  connection: api.IConnection,
) {
  // 1. Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // 2. Create and authenticate admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
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

  // 3. Admin creates a product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 4. Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(3),
        business_description: RandomGenerator.paragraph({ sentences: 10 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 5. Seller creates multiple product sales with different names for sorting tests
  const productNames = [
    "Apple Premium Product",
    "Banana Special Item",
    "Cherry Deluxe Edition",
  ];
  const sales: IShoppingMallSale[] = await ArrayUtil.asyncMap(
    productNames,
    async (productName) => {
      const sale = await api.functional.shoppingMall.seller.sales.create(
        connection,
        {
          body: {
            code: RandomGenerator.alphaNumeric(12),
            shopping_mall_category_id: category.id,
            title: productName,
            description: RandomGenerator.paragraph({ sentences: 20 }),
            condition: "new",
            return_policy_days: 30,
          } satisfies IShoppingMallSale.ICreate,
        },
      );
      typia.assert(sale);
      return sale;
    },
  );

  // 6. Seller creates SKU variants with different prices for each product
  const prices = [50, 100, 25];
  const skus: IShoppingMallSaleSku[] = await ArrayUtil.asyncMap(
    sales,
    async (sale, index) => {
      const sku = await api.functional.shoppingMall.seller.sales.skus.create(
        connection,
        {
          saleCode: sale.code,
          body: {
            sku_code: RandomGenerator.alphaNumeric(8),
            variant_combination: JSON.stringify({ size: "M", color: "Blue" }),
            base_price: prices[index],
            enabled: true,
          } satisfies IShoppingMallSaleSku.ICreate,
        },
      );
      typia.assert(sku);
      return sku;
    },
  );

  // 7. Switch to buyer authentication and add products to wishlist
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // Add SKUs to wishlist
  const wishlistItems: IShoppingMallWishlistItem[] = [];
  for (const sku of skus) {
    const item =
      await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
        connection,
        {
          body: {
            shopping_mall_sale_sku_id: sku.id,
          } satisfies IShoppingMallWishlistItem.ICreate,
        },
      );
    typia.assert(item);
    wishlistItems.push(item);
  }

  // 8. Test sorting by created_at in ascending order (oldest first)
  const sortByCreatedAtAsc: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);

  // Validate created_at ascending order
  for (let i = 0; i < sortByCreatedAtAsc.data.length - 1; i++) {
    const current = new Date(sortByCreatedAtAsc.data[i].created_at);
    const next = new Date(sortByCreatedAtAsc.data[i + 1].created_at);
    TestValidator.predicate(
      "created_at ascending order verification",
      current.getTime() <= next.getTime(),
    );
  }

  // 9. Test sorting by created_at in descending order (newest first)
  const sortByCreatedAtDesc: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);

  // Validate created_at descending order
  for (let i = 0; i < sortByCreatedAtDesc.data.length - 1; i++) {
    const current = new Date(sortByCreatedAtDesc.data[i].created_at);
    const next = new Date(sortByCreatedAtDesc.data[i + 1].created_at);
    TestValidator.predicate(
      "created_at descending order verification",
      current.getTime() >= next.getTime(),
    );
  }

  // 10. Test sorting by price in ascending order (cheapest first)
  const sortByPriceAsc: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          sort_by: "price",
          sort_order: "asc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortByPriceAsc);

  // Validate price ascending order
  for (let i = 0; i < sortByPriceAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "price ascending order verification",
      sortByPriceAsc.data[i].sku.price <= sortByPriceAsc.data[i + 1].sku.price,
    );
  }

  // 11. Test sorting by price in descending order (most expensive first)
  const sortByPriceDesc: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          sort_by: "price",
          sort_order: "desc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortByPriceDesc);

  // Validate price descending order
  for (let i = 0; i < sortByPriceDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "price descending order verification",
      sortByPriceDesc.data[i].sku.price >=
        sortByPriceDesc.data[i + 1].sku.price,
    );
  }

  // 12. Test sorting by product_name in ascending order (A-Z)
  const sortByNameAsc: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          sort_by: "product_name",
          sort_order: "asc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortByNameAsc);

  // Validate product_name ascending order
  for (let i = 0; i < sortByNameAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "product_name ascending order verification",
      sortByNameAsc.data[i].sku.sale.title.localeCompare(
        sortByNameAsc.data[i + 1].sku.sale.title,
      ) <= 0,
    );
  }

  // 13. Test sorting by product_name in descending order (Z-A)
  const sortByNameDesc: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          sort_by: "product_name",
          sort_order: "desc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortByNameDesc);

  // Validate product_name descending order
  for (let i = 0; i < sortByNameDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "product_name descending order verification",
      sortByNameDesc.data[i].sku.sale.title.localeCompare(
        sortByNameDesc.data[i + 1].sku.sale.title,
      ) >= 0,
    );
  }

  // 14. Test default sorting behavior when no sort parameters provided
  const defaultSort: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {} satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(defaultSort);

  // Validate that all items are returned
  TestValidator.equals(
    "default sort returns all wishlist items",
    defaultSort.data.length,
    wishlistItems.length,
  );
}
