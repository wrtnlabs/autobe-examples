import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Basic pagination and data-shape validation for wishlist items search.
 *
 * This E2E test verifies that an authenticated customer can retrieve a
 * paginated list of items for one of their wishlists using PATCH
 * /shoppingMall/customer/wishlists/{wishlistId}/items with a simple
 * IShoppingMallWishlistItem.IRequest payload (page=1, limit=10, no filters).
 *
 * The scenario sets up a realistic multi-actor environment:
 *
 * - A customer joins and creates a wishlist.
 * - A seller joins and creates multiple products.
 * - An admin joins, creates a category, links a product to that category, and
 *   defines an inventory state.
 * - The seller creates SKUs under one product using the inventory state.
 * - The customer logs back in and adds multiple wishlist items that reference the
 *   created products and SKUs.
 *
 * Finally, the customer calls the wishlist items search endpoint with basic
 * pagination. The test then asserts:
 *
 * - Response type matches IPageIShoppingMallWishlistItem.ISummary.
 * - Pagination metadata (current, limit) matches the request.
 * - Returned items correspond to the items created in this test, with correct
 *   product and SKU summaries where applicable.
 * - The default sort order (created_at_desc via added_at timestamps) is
 *   respected.
 */
export async function test_api_wishlist_items_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Customer join (authenticate as customer)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. Customer creates a wishlist
  const wishlistCreateBody = {
    name: "Default",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  // 3. Seller join (authenticate as seller)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Seller creates multiple products
  const products: IShoppingMallProduct[] = [];
  const productCount: number = 3;

  for (let i = 0; i < productCount; i++) {
    const productBody = {
      code: `PRD-${RandomGenerator.alphaNumeric(8)}-${i}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      summary: RandomGenerator.paragraph({ sentences: 5 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      brand: i % 2 === 0 ? "Brand-A" : "Brand-B",
      model_name: `MODEL-${i}`,
      status: "active",
      primary_image_uri:
        "https://cdn.example.com/images/" + RandomGenerator.alphaNumeric(12),
      default_locale: "en-US",
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productBody,
      });
    typia.assert(product);
    products.push(product);
  }

  // 5. Admin join (authenticate as admin)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Wishlist Category",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 7. Admin links first product to the category
  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: products[0].id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 8. Admin creates a SKU inventory state
  const skuInventoryStateBody = {
    code: `inv-${RandomGenerator.alphaNumeric(5)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 9. Switch back to seller via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 10. Seller creates multiple SKUs under second product
  const skuParentProduct: IShoppingMallProduct = products[1];
  const skus: IShoppingMallSku[] = [];
  const skuCount: number = 2;

  for (let i = 0; i < skuCount; i++) {
    const skuBody = {
      code: `SKU-${RandomGenerator.alphaNumeric(6)}-${i}`,
      barcode: `BAR-${RandomGenerator.alphaNumeric(10)}`,
      status: "active",
      price: 1000 + i * 500,
      original_price: 1500 + i * 500,
      inventory_quantity: 10 + i,
      low_stock_threshold: 2,
      shopping_mall_sku_inventory_state_id: inventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;

    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: skuParentProduct.id,
          body: skuBody,
        },
      );
    typia.assert(sku);
    skus.push(sku);
  }

  // 11. Switch back to customer via login
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 12. Customer creates multiple wishlist items
  const createdItems: IShoppingMallWishlistItem[] = [];

  // Item 1: product only (first product)
  const wishlistItemBody1 = {
    shopping_mall_product_id: products[0].id,
    shopping_mall_sku_id: null,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const item1: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemBody1,
      },
    );
  typia.assert(item1);
  createdItems.push(item1);

  // Item 2: product only (third product if exists, otherwise first)
  const productForItem2: IShoppingMallProduct =
    products.length > 2 ? products[2] : products[0];

  const wishlistItemBody2 = {
    shopping_mall_product_id: productForItem2.id,
    shopping_mall_sku_id: null,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const item2: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemBody2,
      },
    );
  typia.assert(item2);
  createdItems.push(item2);

  // Item 3: product + SKU (first SKU of second product)
  const wishlistItemBody3 = {
    shopping_mall_product_id: skuParentProduct.id,
    shopping_mall_sku_id: skus[0].id,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const item3: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemBody3,
      },
    );
  typia.assert(item3);
  createdItems.push(item3);

  // 13. Wishlist items search with basic pagination (page=1, limit=10)
  const requestBody: IShoppingMallWishlistItem.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: undefined,
    productId: undefined,
    skuId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
  };

  const page: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id as string & tags.Format<"uuid">,
        body: requestBody,
      },
    );
  typia.assert(page);

  // 14. Response validation
  // 14-1. Pagination metadata
  TestValidator.equals(
    "wishlist items pagination current page",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "wishlist items pagination limit",
    page.pagination.limit,
    10,
  );

  TestValidator.predicate(
    "wishlist items pagination records >= created items",
    page.pagination.records >= createdItems.length,
  );

  TestValidator.predicate(
    "wishlist items page size does not exceed limit",
    page.data.length <= page.pagination.limit,
  );

  // 14-2. Created items should be present in page data
  for (const created of createdItems) {
    const summary = page.data.find((s) => s.id === created.id);
    TestValidator.predicate(
      `wishlist item ${created.id} must exist in search result`,
      summary !== undefined,
    );

    if (summary !== undefined) {
      typia.assertGuard(summary);

      // Validate product summary id matches original product id
      TestValidator.equals(
        `wishlist item ${created.id} product id matches`,
        summary.product.id,
        created.shopping_mall_product_id,
      );

      if (
        created.shopping_mall_sku_id !== null &&
        created.shopping_mall_sku_id !== undefined
      ) {
        TestValidator.predicate(
          `wishlist item ${created.id} sku summary must exist`,
          summary.sku !== null && summary.sku !== undefined,
        );

        if (summary.sku !== null && summary.sku !== undefined) {
          TestValidator.equals(
            `wishlist item ${created.id} sku id matches`,
            summary.sku.id,
            created.shopping_mall_sku_id,
          );
        }
      }
    }
  }

  // 14-3. Default sort order: created_at_desc / added_at_desc
  if (page.data.length > 1) {
    for (let i = 1; i < page.data.length; i++) {
      const prev = page.data[i - 1];
      const curr = page.data[i];

      TestValidator.predicate(
        "wishlist items default sort is added_at descending",
        prev.added_at >= curr.added_at,
      );
    }
  }
}
