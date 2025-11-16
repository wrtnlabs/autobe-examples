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

export async function test_api_wishlist_item_update_from_product_to_sku(
  connection: api.IConnection,
) {
  // 1. CUSTOMER SETUP & AUTH
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

  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: "https://customer.example.com/login",
        referrer: "https://customer.example.com/landing",
        userAgent: "E2E-Test-Agent",
      } satisfies IShoppingMallCustomerAuth.ILogin,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  const verifiedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: {
        token: RandomGenerator.alphaNumeric(32),
      } satisfies IShoppingMallCustomerAuth.IVerifyEmail,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(verifiedCustomer);

  const customerId: string & tags.Format<"uuid"> = verifiedCustomer.id;

  // 2. PLATFORM ADMIN SETUP (BRAND, CATEGORY TREE, PRODUCT)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(16);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminJoin);

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: platformAdminEmail,
        password: platformAdminPassword,
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/landing",
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLogin);

  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: "Primary category tree for all products",
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

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: "E2E Test Brand",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  const platformProductCode: string = `PADMIN-${RandomGenerator.alphaNumeric(8)}`;
  const platformProductBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: platformProductCode as string & tags.MinLength<1>,
    name: "Platform Admin Product",
    short_description: "Platform admin product for wishlist SKU tests",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/products/platform-admin.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const platformProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: platformProductBody,
      },
    );
  typia.assert<IShoppingMallProduct>(platformProduct);

  // 3. SELLER SETUP (OPTION TYPES, VALUES, SELLER PRODUCT, SKUs)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(14);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: "https://seller.example.com/login",
        referrer: "https://seller.example.com/landing",
      } satisfies IShoppingMallSellerLogin.IRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const sellerProductCode: string = `SELLER-${RandomGenerator.alphaNumeric(8)}`;
  const sellerProductBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode as string & tags.MinLength<1>,
    name: "Seller Product for Wishlist",
    short_description: "Seller product used as wishlist target",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 7,
    }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/products/seller-product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert<IShoppingMallProduct>(sellerProduct);

  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  const optionValueBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  const sellerSkuCode: string = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const sellerSkuBody = {
    code: sellerSkuCode,
    name: "Red Variant",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: sellerSkuBody,
    });
  typia.assert<IShoppingMallProductSku>(sellerSku);

  const platformSkuCode: string = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const platformSkuBody = {
    code: platformSkuCode,
    name: "Platform Variant",
    listPrice: 12000,
    salePrice: 11000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const platformSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: platformProduct.code,
        body: platformSkuBody,
      },
    );
  typia.assert<IShoppingMallProductSku>(platformSku);

  // 4. CUSTOMER WISHLIST & INITIAL ITEM (PRODUCT-LEVEL)
  const reloginCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: "https://customer.example.com/login",
        referrer: "https://customer.example.com/landing",
        userAgent: "E2E-Test-Agent",
      } satisfies IShoppingMallCustomerAuth.ILogin,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(reloginCustomer);
  TestValidator.equals(
    "relogin customer id should match original customer id",
    reloginCustomer.id,
    customerId,
  );

  const wishlistBody = {
    name: "My Wishlist",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  TestValidator.equals(
    "wishlist should belong to the verified customer",
    wishlist.customer.id,
    customerId,
  );

  const wishlistProductItemBody = {
    shopping_mall_product_id: sellerProduct.id,
    shopping_mall_product_sku_id: null,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistProductItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistProductItemBody,
      },
    );
  typia.assert<IShoppingMallWishlistItem>(wishlistProductItem);

  TestValidator.equals(
    "wishlist item product id should match seller product id",
    wishlistProductItem.product.id,
    sellerProduct.id,
  );
  TestValidator.predicate(
    "wishlist item should not yet have a SKU associated",
    wishlistProductItem.sku === null || wishlistProductItem.sku === undefined,
  );

  const originalUpdatedAt: string & tags.Format<"date-time"> =
    wishlistProductItem.updatedAt;

  // 5. UPDATE WISHLIST ITEM TO SKU-LEVEL
  const updateBody = {
    shopping_mall_product_id: sellerProduct.id,
    shopping_mall_product_sku_id: sellerSku.id,
  } satisfies IShoppingMallWishlistItem.IUpdate;

  const updatedWishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.update(
      connection,
      {
        wishlistId: wishlist.id,
        wishlistItemId: wishlistProductItem.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallWishlistItem>(updatedWishlistItem);

  TestValidator.equals(
    "wishlist id on item should remain unchanged after update",
    updatedWishlistItem.wishlist_id,
    wishlist.id,
  );
  TestValidator.equals(
    "product on updated wishlist item should remain the same",
    updatedWishlistItem.product.id,
    sellerProduct.id,
  );
  TestValidator.predicate(
    "updated wishlist item should now have a SKU",
    updatedWishlistItem.sku !== null && updatedWishlistItem.sku !== undefined,
  );
  if (
    updatedWishlistItem.sku !== null &&
    updatedWishlistItem.sku !== undefined
  ) {
    TestValidator.equals(
      "updated wishlist item SKU id should match seller SKU id",
      updatedWishlistItem.sku.id,
      sellerSku.id,
    );
  }

  TestValidator.notEquals(
    "updatedAt should change after wishlist item update",
    updatedWishlistItem.updatedAt,
    originalUpdatedAt,
  );

  // 6a. Authorization: unauthenticated connection must fail to update
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated wishlist item update should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.update(
        unauthConn,
        {
          wishlistId: wishlist.id,
          wishlistItemId: wishlistProductItem.id,
          body: updateBody,
        },
      );
    },
  );

  // 6b. Ownership: another customer cannot update this wishlist item
  const otherCustomerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const otherCustomerPassword: string = RandomGenerator.alphaNumeric(12);

  const otherCustomerJoinBody = {
    email: otherCustomerEmail,
    password: otherCustomerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const otherCustomerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(otherCustomerJoin);

  const otherCustomerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: otherCustomerEmail,
        password: otherCustomerPassword,
        ip: null,
        href: "https://customer.example.com/login",
        referrer: "https://customer.example.com/landing",
        userAgent: "E2E-Test-Agent",
      } satisfies IShoppingMallCustomerAuth.ILogin,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(otherCustomerLogin);

  await TestValidator.error(
    "other customer should not be able to update someone else's wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.update(
        connection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: wishlistProductItem.id,
          body: updateBody,
        },
      );
    },
  );
}
