import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Verify that a customer can retrieve full details of their own wishlist item.
 *
 * Business context:
 *
 * - A customer can create wishlists and add catalog items (products/SKUs) into
 *   them.
 * - Wishlist items are stored in shopping_mall_wishlist_items and exposed via
 *   IShoppingMallWishlistItem, with product and optional SKU summaries.
 * - Only the owning customer should be able to fetch details for a given wishlist
 *   item, scoped by wishlistId + wishlistItemId.
 *
 * Scenario steps implemented:
 *
 * 1. Register a customer (join) and keep their credentials for later login.
 * 2. Register a platform admin and authenticate as that admin.
 * 3. As platform admin, create minimal catalog prerequisites:
 *
 *    - Category tree (created but not used further, to respect dependencies).
 *    - Brand.
 *    - Product associated with the brand.
 *    - SKU under the product.
 * 4. Re-authenticate as the customer (login) so subsequent operations run in the
 *    customer context.
 * 5. Create a wishlist for the customer.
 * 6. Add a wishlist item referencing the created product and SKU.
 * 7. Retrieve the wishlist item details using the wishlistId and wishlistItemId.
 * 8. Assert that:
 *
 *    - The retrieved item matches the created item by id.
 *    - The wishlist_id matches the wishlist.id.
 *    - The product summary matches the created product and the item’s product
 *         summary (id and name equality).
 *    - The sku summary is present and consistent with both the created SKU and
 *         created wishlist item (id, code, priceAmount, currencyCode).
 */
export async function test_api_wishlist_item_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register customer via /auth/customer/join
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Register platform admin via /auth/platformAdmin/join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 3-1. Create category tree as platform admin
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 3-2. Create brand
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3-3. Create product
  const productCode: string & tags.MinLength<1> = typia.random<
    string & tags.MinLength<1>
  >();

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(2),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert<IShoppingMallProduct>(product);

  // 3-4. Create SKU for the product
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const skuBody = {
    code: skuCode,
    name: RandomGenerator.name(1),
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert<IShoppingMallProductSku>(sku);

  // 4. Re-login as the original customer to ensure customer context
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoggedIn);

  // 5. Create wishlist as customer
  const wishlistBody = {
    name: "My Wishlist",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // 6. Create wishlist item referencing product and SKU
  const wishlistItemCreateBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku.id,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const createdItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemCreateBody,
      },
    );
  typia.assert<IShoppingMallWishlistItem>(createdItem);

  // 7. Retrieve wishlist item details as same customer
  const retrievedItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.at(connection, {
      wishlistId: wishlist.id,
      wishlistItemId: createdItem.id,
    });
  typia.assert<IShoppingMallWishlistItem>(retrievedItem);

  // 8. Validation assertions
  TestValidator.equals(
    "wishlist item id matches between create and retrieve",
    retrievedItem.id,
    createdItem.id,
  );

  TestValidator.equals(
    "wishlist_id matches parent wishlist id",
    retrievedItem.wishlist_id,
    wishlist.id,
  );

  // Product summary consistency
  TestValidator.equals(
    "product summary id matches catalog product id",
    retrievedItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "product summary id matches created item product id",
    retrievedItem.product.id,
    createdItem.product.id,
  );
  TestValidator.equals(
    "product summary name stable between create and retrieve",
    retrievedItem.product.name,
    createdItem.product.name,
  );

  // SKU summary consistency: ensure sku is present on both created and retrieved items
  TestValidator.predicate(
    "retrieved wishlist item has SKU summary",
    retrievedItem.sku !== null && retrievedItem.sku !== undefined,
  );
  TestValidator.predicate(
    "created wishlist item has SKU summary",
    createdItem.sku !== null && createdItem.sku !== undefined,
  );

  if (
    retrievedItem.sku !== null &&
    retrievedItem.sku !== undefined &&
    createdItem.sku !== null &&
    createdItem.sku !== undefined
  ) {
    TestValidator.equals(
      "sku summary id matches created wishlist item sku id",
      retrievedItem.sku.id,
      createdItem.sku.id,
    );
    TestValidator.equals(
      "sku summary id matches catalog sku id",
      retrievedItem.sku.id,
      sku.id,
    );
    TestValidator.equals(
      "sku summary code matches between create and retrieve",
      retrievedItem.sku.code,
      createdItem.sku.code,
    );
    TestValidator.equals(
      "sku summary priceAmount matches between create and retrieve",
      retrievedItem.sku.priceAmount,
      createdItem.sku.priceAmount,
    );
    TestValidator.equals(
      "sku summary currencyCode matches between create and retrieve",
      retrievedItem.sku.currencyCode,
      createdItem.sku.currencyCode,
    );
  }
}
