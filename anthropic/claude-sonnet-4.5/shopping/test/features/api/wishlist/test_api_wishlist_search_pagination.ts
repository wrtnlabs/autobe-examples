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
 * Test comprehensive wishlist pagination functionality for buyers with large
 * wishlists.
 *
 * This test validates that buyers can efficiently navigate through large
 * wishlists using proper page controls and limits. It ensures accurate
 * pagination metadata, proper boundary handling, maximum limit enforcement, and
 * consistent item counts.
 *
 * Workflow:
 *
 * 1. Create admin account and product category infrastructure
 * 2. Create seller account and list 25 products with SKUs
 * 3. Create buyer account and add all 25 products to wishlist
 * 4. Test various pagination scenarios (different page sizes and page numbers)
 * 5. Validate pagination metadata accuracy
 * 6. Test boundary conditions (out-of-range pages, maximum limits)
 * 7. Verify total record consistency across all requests
 */
export async function test_api_wishlist_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category creation
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

  // Step 2: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.paragraph({ sentences: 3 }),
        business_description: RandomGenerator.content({ paragraphs: 2 }),
        store_name: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create 25 product sales with SKUs
  const sales = await ArrayUtil.asyncRepeat(25, async (index) => {
    const sale: IShoppingMallSale =
      await api.functional.shoppingMall.seller.sales.create(connection, {
        body: {
          code: `PRODUCT-${RandomGenerator.alphaNumeric(8)}-${index}`,
          shopping_mall_category_id: category.id,
          title: `${RandomGenerator.paragraph({ sentences: 3 })} ${index}`,
          description: RandomGenerator.content({ paragraphs: 2 }),
          brand: RandomGenerator.paragraph({ sentences: 1 }),
          condition: RandomGenerator.pick([
            "new",
            "refurbished",
            "used",
          ] as const),
          short_description: RandomGenerator.paragraph({ sentences: 8 }),
          meta_keywords: RandomGenerator.paragraph({ sentences: 5 }),
          weight: typia.random<
            number & tags.Minimum<0>
          >() satisfies number as number,
          dimension_length: typia.random<
            number & tags.Minimum<0>
          >() satisfies number as number,
          dimension_width: typia.random<
            number & tags.Minimum<0>
          >() satisfies number as number,
          dimension_height: typia.random<
            number & tags.Minimum<0>
          >() satisfies number as number,
          manufacturer: RandomGenerator.paragraph({ sentences: 2 }),
          return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
          warranty_info: RandomGenerator.paragraph({ sentences: 10 }),
          status: "published",
        } satisfies IShoppingMallSale.ICreate,
      });
    typia.assert(sale);
    return sale;
  });

  // Step 5: Create SKUs for each sale
  const skus = await ArrayUtil.asyncMap(sales, async (sale) => {
    const sku: IShoppingMallSaleSku =
      await api.functional.shoppingMall.seller.sales.skus.create(connection, {
        saleCode: sale.code,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          variant_combination: JSON.stringify({
            Color: "Default",
            Size: "Standard",
          }),
          base_price: typia.random<
            number & tags.Minimum<0>
          >() satisfies number as number,
          compare_at_price: null,
          sale_price: null,
          sale_start_at: null,
          sale_end_at: null,
          cost_price: null,
          barcode: null,
          enabled: true,
        } satisfies IShoppingMallSaleSku.ICreate,
      });
    typia.assert(sku);
    return sku;
  });

  // Step 6: Create buyer account
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

  // Step 7: Add all 25 SKUs to buyer's wishlist
  await ArrayUtil.asyncForEach(skus, async (sku) => {
    const wishlistItem: IShoppingMallWishlistItem =
      await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
        connection,
        {
          body: {
            shopping_mall_sale_sku_id: sku.id,
          } satisfies IShoppingMallWishlistItem.ICreate,
        },
      );
    typia.assert(wishlistItem);
  });

  // Step 8: Test pagination - First page with limit 10
  const page1: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals("page 1 total records", page1.pagination.records, 25);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);
  TestValidator.equals("page 1 data length", page1.data.length, 10);

  // Step 9: Test pagination - Second page with limit 10
  const page2: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals("page 2 total records", page2.pagination.records, 25);
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 3);
  TestValidator.equals("page 2 data length", page2.data.length, 10);

  // Step 10: Test pagination - Third page (last page) with limit 10
  const page3: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(page3);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 10);
  TestValidator.equals("page 3 total records", page3.pagination.records, 25);
  TestValidator.equals("page 3 total pages", page3.pagination.pages, 3);
  TestValidator.equals("page 3 data length (last page)", page3.data.length, 5);

  // Step 11: Test page beyond total pages
  const page10: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 10,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(page10);
  TestValidator.equals("page 10 current", page10.pagination.current, 10);
  TestValidator.equals("page 10 total records", page10.pagination.records, 25);
  TestValidator.equals("page 10 total pages", page10.pagination.pages, 3);
  TestValidator.equals("page 10 empty data", page10.data.length, 0);

  // Step 12: Test maximum limit enforcement (100 items per page)
  const maxLimit: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("max limit current", maxLimit.pagination.current, 1);
  TestValidator.equals("max limit value", maxLimit.pagination.limit, 100);
  TestValidator.equals(
    "max limit total records",
    maxLimit.pagination.records,
    25,
  );
  TestValidator.equals("max limit total pages", maxLimit.pagination.pages, 1);
  TestValidator.equals("max limit returns all items", maxLimit.data.length, 25);

  // Step 13: Test single item per page
  const singleItem: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(singleItem);
  TestValidator.equals("single item current", singleItem.pagination.current, 1);
  TestValidator.equals("single item limit", singleItem.pagination.limit, 1);
  TestValidator.equals(
    "single item total records",
    singleItem.pagination.records,
    25,
  );
  TestValidator.equals(
    "single item total pages",
    singleItem.pagination.pages,
    25,
  );
  TestValidator.equals("single item data length", singleItem.data.length, 1);

  // Step 14: Test middle page with limit 5
  const middlePage: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 3,
          limit: 5,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(middlePage);
  TestValidator.equals("middle page current", middlePage.pagination.current, 3);
  TestValidator.equals("middle page limit", middlePage.pagination.limit, 5);
  TestValidator.equals(
    "middle page total records",
    middlePage.pagination.records,
    25,
  );
  TestValidator.equals(
    "middle page total pages",
    middlePage.pagination.pages,
    5,
  );
  TestValidator.equals("middle page data length", middlePage.data.length, 5);

  // Step 15: Verify no duplicate items across pages
  const allPage1: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  const allPage2: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  const allPage3: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );

  const allItemIds = [
    ...allPage1.data.map((item) => item.id),
    ...allPage2.data.map((item) => item.id),
    ...allPage3.data.map((item) => item.id),
  ];
  const uniqueItemIds = new Set(allItemIds);
  TestValidator.equals(
    "no duplicate items across pages",
    allItemIds.length,
    uniqueItemIds.size,
  );
  TestValidator.equals("total items across all pages", allItemIds.length, 25);
}
