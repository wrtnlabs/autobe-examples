import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate platform admin product creation for multiple sellers.
 *
 * Business goal: Ensure that a platform administrator can seed catalog products
 * for different sellers (multi-tenant ownership) via the
 * `/shoppingMall/platformAdmin/products` endpoint, and that each created
 * product’s `seller` summary correctly reflects the owning seller specified by
 * `shopping_mall_seller_id` in the creation payload.
 *
 * Scenario steps:
 *
 * 1. Register a platform admin (Admin #1) using POST /auth/platformAdmin/join.
 * 2. Register Seller A via POST /auth/seller/join and capture its authorized
 *    session (including seller summary and id).
 * 3. Register Seller B via POST /auth/seller/join and capture its authorized
 *    session.
 * 4. Re-establish platform admin context by registering Admin #2 via POST
 *    /auth/platformAdmin/join to ensure Authorization reflects an admin token
 *    again.
 * 5. As the admin, create a brand using POST /shoppingMall/platformAdmin/brands.
 * 6. As the admin, create a category tree using POST
 *    /shoppingMall/platformAdmin/categoryTrees (for realistic catalog context –
 *    not strictly asserted on products).
 * 7. As the admin, create Product A for Seller A via POST
 *    /shoppingMall/platformAdmin/products with an IShoppingMallProduct.ICreate
 *    body where `shopping_mall_seller_id` is Seller A’s id and
 *    `shopping_mall_brand_id` is the created brand id.
 * 8. As the admin, create Product B for Seller B via the same endpoint with a
 *    different code and `shopping_mall_seller_id` set to Seller B’s id.
 * 9. Assert that both product responses conform to IShoppingMallProduct using
 *    typia.assert.
 * 10. Assert that Product A’s `seller` summary matches Seller A’s summary (id,
 *     email, store_name, status) and Product B’s `seller` summary matches
 *     Seller B’s summary.
 * 11. Assert that Product A and Product B have different seller owners by comparing
 *     their `seller.id` fields.
 */
export async function test_api_platform_admin_product_creation_for_different_seller_contexts(
  connection: api.IConnection,
) {
  // 1. Register initial platform admin (Admin #1)
  const adminJoinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin1: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody1,
    });
  typia.assert(admin1);

  // 2. Register Seller A
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Seller-A-${RandomGenerator.alphabets(8)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuth);

  // 3. Register Seller B
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Seller-B-${RandomGenerator.alphabets(8)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuth);

  // 4. Re-establish platform admin context (Admin #2)
  const adminJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join-second",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody2,
    });
  typia.assert(admin2);

  // 5. Create a shared brand as platform admin
  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(8)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(12)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 6. Create a category tree as platform admin (contextual only)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(10)}`,
    name: "Default Category Tree",
    description: "Default category tree for multi-seller catalog seeding.",
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
  typia.assert(categoryTree);

  // 7. Create Product A for Seller A
  const productACode = `seller-a-product-${RandomGenerator.alphaNumeric(10)}`;
  const productABody = {
    shopping_mall_seller_id: sellerAAuth.id,
    shopping_mall_brand_id: brand.id,
    code: productACode as string & tags.MinLength<1>,
    name: "Seller A Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.example.com/images/seller-a-product.png" as string &
        tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productABody,
      },
    );
  typia.assert(productA);

  // 8. Create Product B for Seller B
  const productBCode = `seller-b-product-${RandomGenerator.alphaNumeric(10)}`;
  const productBBody = {
    shopping_mall_seller_id: sellerBAuth.id,
    shopping_mall_brand_id: brand.id,
    code: productBCode as string & tags.MinLength<1>,
    name: "Seller B Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/images/seller-b-product.png" as string &
        tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBBody,
      },
    );
  typia.assert(productB);

  // 9. Ownership assertions: Product A → Seller A
  TestValidator.equals(
    "product A seller id should match Seller A summary id",
    productA.seller.id,
    sellerAAuth.seller.id,
  );
  TestValidator.equals(
    "product A seller email should match Seller A summary email",
    productA.seller.email,
    sellerAAuth.seller.email,
  );
  TestValidator.equals(
    "product A store_name should match Seller A summary store_name",
    productA.seller.store_name,
    sellerAAuth.seller.store_name,
  );
  TestValidator.equals(
    "product A seller status should match Seller A summary status",
    productA.seller.status,
    sellerAAuth.seller.status,
  );

  // 10. Ownership assertions: Product B → Seller B
  TestValidator.equals(
    "product B seller id should match Seller B summary id",
    productB.seller.id,
    sellerBAuth.seller.id,
  );
  TestValidator.equals(
    "product B seller email should match Seller B summary email",
    productB.seller.email,
    sellerBAuth.seller.email,
  );
  TestValidator.equals(
    "product B store_name should match Seller B summary store_name",
    productB.seller.store_name,
    sellerBAuth.seller.store_name,
  );
  TestValidator.equals(
    "product B seller status should match Seller B summary status",
    productB.seller.status,
    sellerBAuth.seller.status,
  );

  // 11. Cross-ownership separation assertions
  TestValidator.notEquals(
    "product A and product B should have different seller owners",
    productA.seller.id,
    productB.seller.id,
  );

  TestValidator.notEquals(
    "Seller A and Seller B summaries should be different",
    sellerAAuth.seller.id,
    sellerBAuth.seller.id,
  );
}
