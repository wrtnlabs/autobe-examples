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

export async function test_api_wishlist_items_search_with_product_and_sku_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join (auto-login)
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = "Password123!";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword as string & tags.Format<"password">,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoin);

  // 2. Create wishlist as this customer
  const wishlistBody = {
    name: "Product and SKU filter wishlist",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  // 3. Seller join (auto-login)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = "SellerPassword123!";

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword as string & tags.Format<"password">,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 4. Create two products as seller
  const productABody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand-A",
    model_name: "Model-A",
    status: "active",
    primary_image_uri: "https://cdn.example.com/productA.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  const productBBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand-B",
    model_name: "Model-B",
    status: "active",
    primary_image_uri: "https://cdn.example.com/productB.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  // 5. Admin join (auto-login)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = "AdminPassword123!";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 6. Create one SKU inventory state as admin
  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Regular in-stock state for SKUs",
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

  // 7. Switch back to seller via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // Create SKUs: two for product A, one for product B
  const skuABodyBase = {
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies Omit<IShoppingMallSku.ICreate, "code" | "barcode">;

  const skuA1Body: IShoppingMallSku.ICreate = {
    code: RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(13),
    status: skuABodyBase.status,
    price: skuABodyBase.price,
    original_price: skuABodyBase.original_price,
    inventory_quantity: skuABodyBase.inventory_quantity,
    low_stock_threshold: skuABodyBase.low_stock_threshold,
    shopping_mall_sku_inventory_state_id:
      skuABodyBase.shopping_mall_sku_inventory_state_id,
    attribute_value_ids: skuABodyBase.attribute_value_ids,
    external_ids: skuABodyBase.external_ids,
  };

  const skuA1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: skuA1Body,
    });
  typia.assert(skuA1);

  const skuA2Body: IShoppingMallSku.ICreate = {
    code: RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(13),
    status: skuABodyBase.status,
    price: 110,
    original_price: 130,
    inventory_quantity: skuABodyBase.inventory_quantity,
    low_stock_threshold: skuABodyBase.low_stock_threshold,
    shopping_mall_sku_inventory_state_id:
      skuABodyBase.shopping_mall_sku_inventory_state_id,
    attribute_value_ids: skuABodyBase.attribute_value_ids,
    external_ids: skuABodyBase.external_ids,
  };

  const skuA2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: skuA2Body,
    });
  typia.assert(skuA2);

  const skuB1Body: IShoppingMallSku.ICreate = {
    code: RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 200,
    original_price: 220,
    inventory_quantity: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 3 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  };

  const skuB1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productB.id,
      body: skuB1Body,
    });
  typia.assert(skuB1);

  // 8. Switch back to customer via login
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // Add wishlist items with various product/SKU combinations
  const itemAProductOnlyBody = {
    shopping_mall_product_id: productA.id,
    shopping_mall_sku_id: null,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const itemAProductOnly: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: itemAProductOnlyBody,
      },
    );
  typia.assert(itemAProductOnly);

  const itemBProductOnlyBody = {
    shopping_mall_product_id: productB.id,
    shopping_mall_sku_id: null,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const itemBProductOnly: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: itemBProductOnlyBody,
      },
    );
  typia.assert(itemBProductOnly);

  const itemAWithSkuA1Body = {
    shopping_mall_product_id: productA.id,
    shopping_mall_sku_id: skuA1.id,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const itemAWithSkuA1: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: itemAWithSkuA1Body,
      },
    );
  typia.assert(itemAWithSkuA1);

  const itemAWithSkuA2Body = {
    shopping_mall_product_id: productA.id,
    shopping_mall_sku_id: skuA2.id,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const itemAWithSkuA2: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: itemAWithSkuA2Body,
      },
    );
  typia.assert(itemAWithSkuA2);

  // 9. Search with combined productId and skuId filters for product A and SKU A1
  const searchBodyA1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "created_at_desc",
    productId: productA.id,
    skuId: skuA1.id,
    createdFrom: undefined,
    createdTo: undefined,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageA1: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id as string & tags.Format<"uuid">,
        body: searchBodyA1,
      },
    );
  typia.assert(pageA1);

  // 10. Validate filtered results for product A + SKU A1
  TestValidator.equals(
    "pagination current page should be 1",
    pageA1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    pageA1.pagination.limit,
    20,
  );

  TestValidator.predicate(
    "at least one wishlist item returned for product A and SKU A1",
    pageA1.data.length >= 1,
  );

  for (const item of pageA1.data) {
    // All items must be for product A
    TestValidator.equals(
      "each item product must be productA",
      item.product.id,
      productA.id,
    );

    // All items must have sku equal to SKU A1
    TestValidator.predicate(
      "each item must have a non-null sku",
      item.sku !== null && item.sku !== undefined,
    );

    if (item.sku !== null && item.sku !== undefined) {
      TestValidator.equals(
        "each item sku must be SKU A1",
        item.sku.id,
        skuA1.id,
      );
    }

    // Ensure no items for product B or SKU A2 appear
    TestValidator.notEquals(
      "no item for productB in A1-filtered result",
      item.product.id,
      productB.id,
    );
  }

  // 11. Secondary check: search with productId + SKU A2
  const searchBodyA2 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "created_at_desc",
    productId: productA.id,
    skuId: skuA2.id,
    createdFrom: undefined,
    createdTo: undefined,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageA2: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id as string & tags.Format<"uuid">,
        body: searchBodyA2,
      },
    );
  typia.assert(pageA2);

  TestValidator.predicate(
    "at least one wishlist item returned for product A and SKU A2",
    pageA2.data.length >= 1,
  );

  for (const item of pageA2.data) {
    TestValidator.equals(
      "each item product must be productA for A2-filtered result",
      item.product.id,
      productA.id,
    );
    TestValidator.predicate(
      "each item must have a non-null sku for A2-filtered result",
      item.sku !== null && item.sku !== undefined,
    );
    if (item.sku !== null && item.sku !== undefined) {
      TestValidator.equals(
        "each item sku must be SKU A2",
        item.sku.id,
        skuA2.id,
      );
      TestValidator.notEquals(
        "no item with SKU A1 in A2-filtered result",
        item.sku.id,
        skuA1.id,
      );
    }
  }
}
