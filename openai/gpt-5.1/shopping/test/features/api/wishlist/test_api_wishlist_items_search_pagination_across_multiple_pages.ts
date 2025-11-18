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
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_items_search_pagination_across_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Admin join and create SKU inventory state
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const inventoryStateBody = {
    code: `state-${RandomGenerator.alphabets(8)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 2. Seller join, create product and SKU
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [
      {
        system_code: "WMS",
        external_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSkuExternalId.ICreate,
    ],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 3. Customer join and create wishlist
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() satisfies
      | string
      | null
      | undefined,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const wishlistBody = {
    name: "Pagination Test Wishlist",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  // 4. Populate wishlist with more than one page worth of items (25 items, limit=10)
  const limit = 10;
  const totalItems = 25;
  const createdItemIds: (string & tags.Format<"uuid">)[] = [];

  for (let i = 0; i < totalItems; i++) {
    const itemBody = {
      shopping_mall_product_id: product.id,
      shopping_mall_sku_id: sku.id,
      position: i,
    } satisfies IShoppingMallWishlistItem.ICreate;

    const item: IShoppingMallWishlistItem =
      await api.functional.shoppingMall.customer.wishlists.items.create(
        connection,
        {
          wishlistId: wishlist.id,
          body: itemBody,
        },
      );
    typia.assert(item);
    createdItemIds.push(item.id);
  }

  // 5. Fetch three pages using PATCH index with pagination
  const requestBase = {
    limit,
    sort: "created_at_asc" as const,
  } satisfies Pick<IShoppingMallWishlistItem.IRequest, "limit" | "sort">;

  const page1: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          page: 1,
          limit: requestBase.limit,
          sort: requestBase.sort,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(page1);

  const page2: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          page: 2,
          limit: requestBase.limit,
          sort: requestBase.sort,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(page2);

  const page3: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          page: 3,
          limit: requestBase.limit,
          sort: requestBase.sort,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(page3);

  // 6. Validate pagination metadata
  TestValidator.equals(
    "page1 current page should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page2 current page should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page3 current page should be 3",
    page3.pagination.current,
    3,
  );

  TestValidator.equals(
    "page1 limit should equal requested limit",
    page1.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page2 limit should equal requested limit",
    page2.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page3 limit should equal requested limit",
    page3.pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "total pages should be at least 3 when 25 items with limit 10",
    page1.pagination.pages >= 3,
  );

  // 7. Validate page sizes (10, 10, 5)
  TestValidator.equals("page1 should contain 10 items", page1.data.length, 10);
  TestValidator.equals("page2 should contain 10 items", page2.data.length, 10);
  TestValidator.equals(
    "page3 should contain remaining 5 items",
    page3.data.length,
    5,
  );

  // 8. Extract and validate non-overlapping ids
  const ids1 = page1.data.map((i) => i.id);
  const ids2 = page2.data.map((i) => i.id);
  const ids3 = page3.data.map((i) => i.id);

  const hasIntersection = <T extends string>(a: T[], b: T[]): boolean =>
    ArrayUtil.has(a, (x) => b.includes(x));

  TestValidator.predicate(
    "page1 and page2 should not share item ids",
    hasIntersection(ids1, ids2) === false,
  );
  TestValidator.predicate(
    "page2 and page3 should not share item ids",
    hasIntersection(ids2, ids3) === false,
  );
  TestValidator.predicate(
    "page1 and page3 should not share item ids",
    hasIntersection(ids1, ids3) === false,
  );

  // 9. Validate that union of page ids equals all created ids (ignoring ordering)
  const combinedIds = [...ids1, ...ids2, ...ids3];

  const sortedCombined = [...combinedIds].sort();
  const sortedCreated = [...createdItemIds].sort();

  TestValidator.equals(
    "union of all page ids should equal set of created item ids",
    sortedCombined,
    sortedCreated,
  );

  // 10. Validate sort order within and across pages based on created_at
  const assertNonDecreasing = (title: string, values: string[]): void => {
    TestValidator.predicate(title, () => {
      for (let i = 1; i < values.length; i++) {
        if (values[i - 1] > values[i]) return false;
      }
      return true;
    });
  };

  const created1 = page1.data.map((i) => i.created_at);
  const created2 = page2.data.map((i) => i.created_at);
  const created3 = page3.data.map((i) => i.created_at);

  assertNonDecreasing("page1 created_at should be non-decreasing", created1);
  assertNonDecreasing("page2 created_at should be non-decreasing", created2);
  assertNonDecreasing("page3 created_at should be non-decreasing", created3);

  if (created1.length > 0 && created2.length > 0) {
    TestValidator.predicate(
      "first item on page2 should not be earlier than last item on page1",
      created1[created1.length - 1] <= created2[0],
    );
  }
  if (created2.length > 0 && created3.length > 0) {
    TestValidator.predicate(
      "first item on page3 should not be earlier than last item on page2",
      created2[created2.length - 1] <= created3[0],
    );
  }
}
