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
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_item_update_to_switch_sku_variant(
  connection: api.IConnection,
) {
  // 1. Create actors: platform admin, seller, customer
  const platformAdminEmail = `${RandomGenerator.alphabets(8)}@admin.example.com`;
  const sellerEmail = `${RandomGenerator.alphabets(8)}@seller.example.com`;
  const customerEmail = `${RandomGenerator.alphabets(8)}@customer.example.com`;

  const commonHref = "https://example.com/join" as const;
  const commonReferrer = "https://example.com/landing" as const;

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: commonHref,
    referrer: commonReferrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: commonHref,
    referrer: commonReferrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 2. Platform admin: category tree + brand
  // Switch to platform admin explicitly (login) to reflect realistic flow
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "AdminPass123!",
    ip: null,
    href: commonHref,
    referrer: commonReferrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: "Main Catalog Tree",
    description: "Primary category tree for tests",
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
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphabets(6)}`,
    description: "Test brand for wishlist SKU switch scenario",
    logo_uri: "https://example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Seller catalog setup: product, option type/values, SKUs
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: null,
    href: commonHref,
    referrer: commonReferrer,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Wishlist Switchable Product",
    short_description: "Product with multiple size variants for wishlist test",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  const optionValueMBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueLBody = {
    value: "L",
    display_name: "Large",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueM: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueMBody,
      },
    );
  typia.assert(optionValueM);

  const optionValueL: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueLBody,
      },
    );
  typia.assert(optionValueL);

  const sku1Code = `sku-${RandomGenerator.alphaNumeric(6)}`;
  const sku2Code = `sku-${RandomGenerator.alphaNumeric(6)}`;

  const sku1Body = {
    code: sku1Code,
    name: `Size M for ${product.name}`,
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku2Body = {
    code: sku2Code,
    name: `Size L for ${product.name}`,
    listPrice: 110,
    salePrice: 100,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: sku1Body,
    });
  typia.assert(sku1);

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: sku2Body,
    });
  typia.assert(sku2);

  // 4. Customer wishlist and initial item
  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    ip: null,
    href: commonHref,
    referrer: commonReferrer,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const wishlistCreateBody = {
    name: "Wishlist for SKU switch",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  const wishlistItemCreateBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku1.id,
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

  TestValidator.equals(
    "initial wishlist item product id matches product",
    wishlistItem.product.id,
    product.id,
  );
  TestValidator.predicate(
    "initial wishlist item has sku summary",
    wishlistItem.sku !== null && wishlistItem.sku !== undefined,
  );

  const initialSkuSummary = wishlistItem.sku!;

  TestValidator.equals(
    "initial sku summary id matches sku1 id",
    initialSkuSummary.id,
    sku1.id,
  );

  // 5. Main update: switch to sku2
  const updateBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku2.id,
  } satisfies IShoppingMallWishlistItem.IUpdate;

  const updatedItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.update(
      connection,
      {
        wishlistId: wishlist.id,
        wishlistItemId: wishlistItem.id,
        body: updateBody,
      },
    );
  typia.assert(updatedItem);

  TestValidator.equals(
    "wishlist id remains unchanged after sku switch",
    updatedItem.wishlist_id,
    wishlist.id,
  );
  TestValidator.equals(
    "product summary id remains same after sku switch",
    updatedItem.product.id,
    wishlistItem.product.id,
  );
  TestValidator.predicate(
    "updated wishlist item has sku summary",
    updatedItem.sku !== null && updatedItem.sku !== undefined,
  );

  const updatedSkuSummary = updatedItem.sku!;

  TestValidator.notEquals(
    "sku id changed after update (switch variant)",
    updatedSkuSummary.id,
    initialSkuSummary.id,
  );
  TestValidator.equals(
    "updated sku id matches sku2 id",
    updatedSkuSummary.id,
    sku2.id,
  );

  // 6. Authorization negative case: unauthenticated update must fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated user cannot update wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.update(
        unauthenticatedConnection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: wishlistItem.id,
          body: updateBody,
        },
      );
    },
  );

  // 7. Uniqueness negative case: attempt to create duplicate target combination
  const secondItemCreateBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku2.id,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const secondItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: secondItemCreateBody,
      },
    );
  typia.assert(secondItem);

  TestValidator.equals(
    "second item sku id is sku2",
    secondItem.sku?.id ?? null,
    sku2.id,
  );

  const duplicateUpdateBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: sku2.id,
  } satisfies IShoppingMallWishlistItem.IUpdate;

  await TestValidator.error(
    "switching first item to sku2 when another item already uses sku2 should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.update(
        connection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: wishlistItem.id,
          body: duplicateUpdateBody,
        },
      );
    },
  );
}
