import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
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

export async function test_api_seller_sku_delete_with_brand_and_options(
  connection: api.IConnection,
) {
  /**
   * This E2E test validates that a SKU created under a seller-owned product
   * (with brand and option structures configured) can be deleted by the seller
   * using the seller-side SKU delete endpoint.
   *
   * Steps:
   *
   * 1. Register a seller and obtain seller identity (join implicitly
   *    authenticates).
   * 2. Register a platform admin (admin join implicitly authenticates).
   * 3. As platform admin, create a category tree.
   * 4. As platform admin, create a brand.
   * 5. Switch back to seller context using seller login.
   * 6. As seller, create a multi-SKU product associated with the created brand.
   * 7. As seller, create an option type (e.g., "Color") for that product.
   * 8. As seller, create one option value (e.g., "red") under that option type.
   * 9. Switch to platform admin context using platform admin login.
   * 10. As platform admin, create a SKU under the product.
   * 11. Switch back to seller context.
   * 12. As seller, delete the SKU via DELETE
   *     /shoppingMall/seller/products/{productCode}/skus/{skuCode}.
   *
   * We assert each non-void response with typia.assert to ensure contract
   * correctness and use TestValidator to verify key relational properties.
   */

  // 1. Seller join (also authenticates seller on this connection)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // Capture seller email for later logins
  const sellerEmail: string & tags.Format<"email"> = sellerAuthorized.email;

  // 2. Platform admin join (also authenticates as admin on same connection)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  const platformAdminEmail: string & tags.Format<"email"> =
    platformAdminAuthorized.email;

  // 3. As platform admin, create a category tree
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 4. As platform admin, create a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.paragraph({ sentences: 1 })}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 5. Switch back to seller context by logging in as seller
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/dashboard",
    referrer: "https://seller.example.com/login",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerSession: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerSession);

  // 6. As seller, create a multi-SKU product associated with the brand
  const productCode: string & tags.MinLength<1> =
    `prd-${RandomGenerator.alphaNumeric(12)}` as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerSession.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active", // non-empty status string
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "product.is_multi_sku should be true",
    product.is_multi_sku,
    true,
  );
  if (product.brand !== null && product.brand !== undefined) {
    TestValidator.equals(
      "product brand id should match created brand id",
      product.brand.id,
      brand.id,
    );
  }

  // 7. As seller, create an option type for that product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
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
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 8. As seller, create an option value under that option type
  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  TestValidator.equals(
    "option value should reference the correct option type",
    optionValue.optionType.id,
    optionType.id,
  );

  // 9. Switch to platform admin context via platform admin login
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminSession: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminSession);

  // 10. As platform admin, create a SKU for the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;

  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} / Red`,
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
  typia.assert<IShoppingMallProductSku>(sku);

  TestValidator.equals(
    "sku code should match requested code",
    sku.code,
    skuCreateBody.code,
  );
  TestValidator.equals(
    "sku.productCode should match product.code",
    sku.productCode,
    product.code,
  );
  TestValidator.equals(
    "sku.product.id should match product.id",
    sku.product.id,
    product.id,
  );

  // 11. Switch back to seller context again
  const sellerSessionAfterSku: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerSessionAfterSku);

  // 12. As seller, delete the SKU using seller-facing erase endpoint
  await api.functional.shoppingMall.seller.products.skus.erase(connection, {
    productCode: product.code,
    skuCode: sku.code,
  });

  // If we reach here without error, we consider deletion successful.
  TestValidator.predicate(
    "seller should be able to delete SKU with brand and options configured",
    true,
  );
}
