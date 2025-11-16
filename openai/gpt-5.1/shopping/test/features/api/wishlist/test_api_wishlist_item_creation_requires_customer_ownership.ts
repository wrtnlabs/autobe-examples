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
 * Validate that wishlist item creation is constrained by customer ownership.
 *
 * Business workflow:
 *
 * 1. Register Customer A and implicitly authenticate as A.
 * 2. Customer A creates Wishlist A.
 * 3. Register Customer B (implicit auth switch to B).
 * 4. Register a platform admin and stay authenticated as platformAdmin.
 * 5. As platformAdmin, create supporting catalog entities: category tree, brand,
 *    and product.
 * 6. Switch auth to Customer B and attempt to append an item into Customer A's
 *    wishlist using the created product id → expect error.
 * 7. Switch auth to Customer A and add the same product into Wishlist A → expect
 *    success.
 * 8. Validate that the successful wishlist item belongs to Wishlist A and
 *    references the created product.
 */
export async function test_api_wishlist_item_creation_requires_customer_ownership(
  connection: api.IConnection,
) {
  // 1. Register Customer A (and authenticate as A)
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAPassword = RandomGenerator.alphaNumeric(12);
  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuth);

  // 2. Customer A creates Wishlist A
  const wishlistACreateBody = {
    name: "Wishlist A",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistACreateBody,
    });
  typia.assert(wishlistA);

  // 3. Register Customer B (implicit auth switch to B)
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerBPassword = RandomGenerator.alphaNumeric(12);
  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuth);

  // 4. Register a platform admin (implicit auth switch to platformAdmin)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const adminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 5. As platformAdmin, create catalog entities: category tree, brand, product
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
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
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(10)}`,
    name: "Wishlist Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
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
  typia.assert(product);

  // 6. Switch auth to Customer B using explicit login
  const customerBLoginBody = {
    email: customerBEmail,
    password: customerBPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerBLoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBLoginAuth);

  // 7. As Customer B, attempt to create wishlist item under Wishlist A → expect error
  const forbiddenWishlistItemBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  await TestValidator.error(
    "customer B cannot add item to customer A's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.create(
        connection,
        {
          wishlistId: wishlistA.id,
          body: forbiddenWishlistItemBody,
        },
      );
    },
  );

  // 8. Switch auth to Customer A using explicit login
  const customerALoginBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerALoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALoginAuth);

  // 9. As Customer A, successfully create wishlist item under Wishlist A
  const allowedWishlistItemBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlistA.id,
        body: allowedWishlistItemBody,
      },
    );
  typia.assert(wishlistItem);

  // 10. Validate ownership and product association of the created wishlist item
  TestValidator.equals(
    "wishlist item belongs to wishlist A",
    wishlistItem.wishlist_id,
    wishlistA.id,
  );
  TestValidator.equals(
    "wishlist item references created product",
    wishlistItem.product.id,
    product.id,
  );
}
