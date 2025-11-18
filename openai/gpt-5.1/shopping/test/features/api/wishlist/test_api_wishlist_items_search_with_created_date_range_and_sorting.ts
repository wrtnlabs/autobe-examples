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

export async function test_api_wishlist_items_search_with_created_date_range_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer (join auto-logs in and sets token)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create a wishlist for the customer
  const wishlistBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // 3. Register a seller and create a product
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 4. Register an admin and create a SKU inventory state
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 5. Switch back to seller (login) just to follow scenario explicitly
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 6. Create a SKU for the product
  const skuBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 7. Switch back to customer via login (even though join already logged in)
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  // 8. Add multiple wishlist items with distinguishable created_at timestamps.
  // We rely on server timestamps increasing with each call.
  const wishlistItemCount = 5;
  const createdItems: IShoppingMallWishlistItem[] = [];

  for (let i = 0; i < wishlistItemCount; i++) {
    const itemBody = {
      shopping_mall_product_id: product.id,
      shopping_mall_sku_id: sku.id,
      position: null,
    } satisfies IShoppingMallWishlistItem.ICreate;

    const created: IShoppingMallWishlistItem =
      await api.functional.shoppingMall.customer.wishlists.items.create(
        connection,
        {
          wishlistId: wishlist.id,
          body: itemBody,
        },
      );
    typia.assert<IShoppingMallWishlistItem>(created);
    createdItems.push(created);
  }

  // Sort locally by created_at ascending to get deterministic boundaries
  createdItems.sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
  );

  TestValidator.equals(
    "number of created wishlist items should match",
    createdItems.length,
    wishlistItemCount,
  );

  // Choose a middle range: exclude the earliest and latest to ensure filtering works
  const middleStart = createdItems[1];
  const middleEnd = createdItems[3];

  const createdFrom = middleStart.created_at;
  const createdTo = middleEnd.created_at;

  // 9. Call index with ascending sort and date range filter
  const requestAsc = {
    page: 1,
    limit: 10,
    sort: "created_at_asc" as const,
    productId: product.id,
    skuId: sku.id,
    createdFrom,
    createdTo,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageAsc: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: requestAsc,
      },
    );
  typia.assert<IPageIShoppingMallWishlistItem.ISummary>(pageAsc);

  const itemsAsc = pageAsc.data;

  // Assert that all items fall in [createdFrom, createdTo] and are sorted ascending
  for (const item of itemsAsc) {
    TestValidator.predicate(
      "item.created_at should be >= createdFrom",
      item.created_at >= createdFrom,
    );
    TestValidator.predicate(
      "item.created_at should be <= createdTo",
      item.created_at <= createdTo,
    );
  }

  for (let i = 1; i < itemsAsc.length; i++) {
    const prev = itemsAsc[i - 1];
    const curr = itemsAsc[i];
    TestValidator.predicate(
      "ascending created_at order",
      prev.created_at <= curr.created_at,
    );
  }

  // 10. Call index with descending sort and same date range
  const requestDesc = {
    page: requestAsc.page,
    limit: requestAsc.limit,
    sort: "created_at_desc" as const,
    productId: product.id,
    skuId: sku.id,
    createdFrom,
    createdTo,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageDesc: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: requestDesc,
      },
    );
  typia.assert<IPageIShoppingMallWishlistItem.ISummary>(pageDesc);

  const itemsDesc = pageDesc.data;

  // Assert same set of ids between asc and desc results
  const ascIds = itemsAsc.map((i) => i.id).sort();
  const descIds = itemsDesc.map((i) => i.id).sort();
  TestValidator.equals(
    "ascending and descending results should contain same item ids",
    ascIds,
    descIds,
  );

  // Assert descending order by created_at
  for (let i = 1; i < itemsDesc.length; i++) {
    const prev = itemsDesc[i - 1];
    const curr = itemsDesc[i];
    TestValidator.predicate(
      "descending created_at order",
      prev.created_at >= curr.created_at,
    );
  }
}
