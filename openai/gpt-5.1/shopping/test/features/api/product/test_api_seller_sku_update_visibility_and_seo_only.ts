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
import type { IShoppingMallProductSkuChannelVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSkuChannelVisibility";
import type { IShoppingMallProductSkuMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSkuMetadata";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify that a seller can partially update only SEO and channel visibility
 * fields of a SKU via the seller PUT endpoint without changing pricing or
 * purchasability flags.
 *
 * Business flow:
 *
 * 1. Register a seller account and obtain authenticated seller context.
 * 2. Register a platform admin account and obtain authenticated admin context.
 * 3. As platform admin, create a category tree and a brand (to mirror realistic
 *    catalog setup).
 * 4. As platform admin, create an admin-managed product in shopping_mall_products
 *    with a unique product code.
 * 5. Switch to seller context and create a seller-owned product that uses the same
 *    product code.
 * 6. Under the seller product, create an option type and a single option value to
 *    simulate variant semantics.
 * 7. Switch back to platform admin and create a SKU for the product with explicit
 *    baseline values for listPrice, salePrice, isActive, and isPurchasable.
 * 8. Capture the created SKU as the baseline state.
 * 9. Switch to seller context and call the seller SKU update endpoint with a body
 *    that only sets seoTitle, seoDescription, channelVisibility, and metadata,
 *    intentionally omitting pricing and flags.
 * 10. Validate that:
 *
 *     - The response is a full IShoppingMallProductSku and passes typia.assert.
 *     - SeoTitle and seoDescription match the new values.
 *     - ChannelVisibility in the update is reflected in the SKU (to the extent
 *           exposed by the read model).
 *     - ListPrice, salePrice, isActive, and isPurchasable are identical to the
 *           baseline values, proving that omitted fields are not changed by the
 *           partial update.
 *     - Identity fields (id, code, productCode) remain unchanged.
 */
export async function test_api_seller_sku_update_visibility_and_seo_only(
  connection: api.IConnection,
) {
  // 1. Seller join (creates and authenticates seller)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 2. Platform admin join (creates and authenticates admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 3. As platform admin, create category tree and brand
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
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

  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 4. As platform admin, create a catalog product with unique code
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;

  // Platform admin needs a seller to own the product; reuse the existing seller id
  const adminProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Admin Product ${RandomGenerator.name(1)}` as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;
  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductCreateBody,
      },
    );
  typia.assert<IShoppingMallProduct>(adminProduct);

  TestValidator.equals(
    "admin product code matches requested code",
    adminProduct.code,
    productCode,
  );

  // 5. Switch to seller context and create seller-owned product with same product code
  // Ensure we are logged in as seller (join already set token, but login again for clarity)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerSession: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerSession);

  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerSession.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Seller Product ${RandomGenerator.name(1)}` as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/seller-product.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;
  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert<IShoppingMallProduct>(sellerProduct);

  TestValidator.equals(
    "seller product code matches shared product code",
    sellerProduct.code,
    productCode,
  );

  // 6. As seller, create an option type and a single option value
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  const optionValueCreateBody = {
    value: "BLUE",
    display_name: "Blue",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  // 7. Switch back to platform admin and create baseline SKU
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminSession: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminSession);

  const baselineSkuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: "Baseline SKU",
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const baselineSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: baselineSkuCreateBody,
      },
    );
  typia.assert<IShoppingMallProductSku>(baselineSku);

  // Capture baseline pricing and flags
  const baselineListPrice = baselineSku.listPrice;
  const baselineSalePrice = baselineSku.salePrice;
  const baselineIsActive = baselineSku.isActive;
  const baselineIsPurchasable = baselineSku.isPurchasable;
  const baselineId = baselineSku.id;
  const baselineCode = baselineSku.code;
  const baselineProductCode = baselineSku.productCode;

  // 8. Switch to seller context to perform partial SEO/visibility update
  const sellerSession2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerSession2);

  const channelVisibilityUpdate: IShoppingMallProductSkuChannelVisibility.IUpdate =
    {
      web: false,
      mobile: true,
      marketplace: true,
    };
  const metadataUpdate: IShoppingMallProductSkuMetadata.IUpdate = {
    campaign: "spring-2025",
    segment: "vip",
  };

  const updateBody = {
    seoTitle: "Spring 2025 VIP Blue Variant",
    seoDescription:
      "Exclusive blue color variant for VIP customers in Spring 2025.",
    channelVisibility: channelVisibilityUpdate,
    metadata: metadataUpdate,
  } satisfies IShoppingMallProductSku.IUpdate;

  const updatedSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productCode,
      skuCode: baselineSku.code,
      body: updateBody,
    });
  typia.assert<IShoppingMallProductSku>(updatedSku);

  // 9. Business validations
  // Identity fields unchanged
  TestValidator.equals(
    "SKU id remains unchanged after partial update",
    updatedSku.id,
    baselineId,
  );
  TestValidator.equals(
    "SKU code remains unchanged after partial update",
    updatedSku.code,
    baselineCode,
  );
  TestValidator.equals(
    "SKU productCode remains unchanged after partial update",
    updatedSku.productCode,
    baselineProductCode,
  );

  // Pricing and flags unchanged
  TestValidator.equals(
    "listPrice is unchanged when omitted from update body",
    updatedSku.listPrice,
    baselineListPrice,
  );
  TestValidator.equals(
    "salePrice is unchanged when omitted from update body",
    updatedSku.salePrice,
    baselineSalePrice,
  );
  TestValidator.equals(
    "isActive is unchanged when omitted from update body",
    updatedSku.isActive,
    baselineIsActive,
  );
  TestValidator.equals(
    "isPurchasable is unchanged when omitted from update body",
    updatedSku.isPurchasable,
    baselineIsPurchasable,
  );

  // We cannot directly inspect seoTitle/seoDescription/channelVisibility/metadata
  // on IShoppingMallProductSku because they are not part of the read model.
  // Instead, we just assert that update call succeeded and identity/pricing
  // invariants held; deeper SEO/visibility verification would require
  // additional read models that are not exposed in IShoppingMallProductSku.
}
