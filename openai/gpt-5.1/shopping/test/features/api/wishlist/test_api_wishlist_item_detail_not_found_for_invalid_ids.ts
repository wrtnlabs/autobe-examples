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

export async function test_api_wishlist_item_detail_not_found_for_invalid_ids(
  connection: api.IConnection,
) {
  // 1. Prepare actor accounts: platform admin and customer
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // Join customer (this call also authenticates as customer)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. As platform admin, prepare catalog data: category tree, brand, product, SKU
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: undefined,
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: undefined,
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  const productCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: `prd-${RandomGenerator.alphaNumeric(10)}` as string &
      tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: null,
    description: null,
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 3. Switch back to customer and create a wishlist and a baseline item
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  const wishlistCreateBody = {
    name: "Primary Wishlist",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  const wishlistItemCreateBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku.id,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemCreateBody,
      },
    );
  typia.assert(wishlistItem);

  // 4. Negative case A: random wishlistId and random wishlistItemId
  const randomWishlistIdA = typia.random<string & tags.Format<"uuid">>();
  const randomWishlistItemIdA = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "wishlist item detail: completely random ids should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.at(
        connection,
        {
          wishlistId: randomWishlistIdA,
          wishlistItemId: randomWishlistItemIdA,
        },
      );
    },
  );

  // 5. Negative case B: real wishlistId, random wishlistItemId
  const randomWishlistItemIdB = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "wishlist item detail: real wishlistId but random item id should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.at(
        connection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: randomWishlistItemIdB,
        },
      );
    },
  );

  // 6. Negative case C: random wishlistId, real wishlistItemId
  const randomWishlistIdC = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "wishlist item detail: random wishlistId with real item id should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.at(
        connection,
        {
          wishlistId: randomWishlistIdC,
          wishlistItemId: wishlistItem.id,
        },
      );
    },
  );

  // 7. Positive case: correct wishlistId and wishlistItemId should succeed
  const fetched: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.at(connection, {
      wishlistId: wishlist.id,
      wishlistItemId: wishlistItem.id,
    });
  typia.assert(fetched);

  TestValidator.equals(
    "wishlist item detail: fetched item id matches baseline",
    fetched.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "wishlist item detail: fetched item is linked to requested wishlist",
    fetched.wishlist_id,
    wishlist.id,
  );
}
