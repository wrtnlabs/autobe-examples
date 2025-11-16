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

export async function test_api_platform_admin_sku_update_full_catalog_control(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create brand as platform admin
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Create category tree as platform admin (context setup)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
    description: "Main catalog tree for tests",
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

  // 4. Register and authenticate seller (multi-actor setup)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. As seller, create a product (seller-scoped) that will share the same business product code
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;

  const sellerProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Test Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);
  TestValidator.equals(
    "seller product code should match requested code",
    sellerProduct.code,
    productCode,
  );

  // 6. As seller, create an option type for the product
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 7. As seller, create an option value for that option type
  const optionValueBody = {
    value: "blue",
    display_name: "Blue",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 8. Switch back to platform admin via login to ensure admin context
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 9. As platform admin, create catalog product backing the same seller and brand
  const adminProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: sellerProduct.name,
    short_description: sellerProduct.short_description ?? undefined,
    description: sellerProduct.description ?? undefined,
    status: "active",
    is_multi_sku: true,
    primary_image_uri: sellerProduct.primary_image_uri ?? undefined,
    additional_data: sellerProduct.additional_data ?? undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductBody,
      },
    );
  typia.assert(adminProduct);
  TestValidator.equals(
    "admin product code should match shared product code",
    adminProduct.code,
    productCode,
  );

  // 10. As platform admin, create an initial SKU for that product
  const initialSkuCode = `SKU-${RandomGenerator.alphaNumeric(6)}`;

  const skuCreateBody = {
    code: initialSkuCode,
    name: `SKU ${initialSkuCode}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const initialSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(initialSku);

  // Capture initial state for comparison
  const initialSkuSnapshot: IShoppingMallProductSku = initialSku;

  // 11. Prepare update payload with full mutable field coverage
  const channelVisibilityUpdate: IShoppingMallProductSkuChannelVisibility.IUpdate =
    {
      web: false,
      mobile: true,
      marketplace: true,
    };

  const metadataUpdate: IShoppingMallProductSkuMetadata.IUpdate = {
    testKey: "test-value",
    channel_group: "flash-sale",
  };

  const updatedDisplayName = `${initialSku.name} - Updated`;
  const updatedListPrice = initialSku.listPrice + 1000;
  const updatedSalePrice = initialSku.salePrice + 500;

  const skuUpdateBody = {
    displayName: updatedDisplayName,
    listPrice: updatedListPrice,
    salePrice: updatedSalePrice,
    isActive: false,
    isPurchasable: false,
    channelVisibility: channelVisibilityUpdate,
    seoTitle: `SEO ${updatedDisplayName}`,
    seoDescription: RandomGenerator.paragraph({ sentences: 4 }),
    metadata: metadataUpdate,
  } satisfies IShoppingMallProductSku.IUpdate;

  const updatedSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.update(
      connection,
      {
        productCode,
        skuCode: initialSkuCode,
        body: skuUpdateBody,
      },
    );
  typia.assert(updatedSku);

  // 12. Validate identity fields remain stable
  TestValidator.equals(
    "SKU id must remain stable after update",
    updatedSku.id,
    initialSkuSnapshot.id,
  );
  TestValidator.equals(
    "SKU code must remain stable after update",
    updatedSku.code,
    initialSkuSnapshot.code,
  );
  TestValidator.equals(
    "SKU productCode must remain stable after update",
    updatedSku.productCode,
    initialSkuSnapshot.productCode,
  );
  TestValidator.equals(
    "SKU product summary id should remain same",
    updatedSku.product.id,
    initialSkuSnapshot.product.id,
  );

  // 13. Validate updated mutable fields
  TestValidator.equals(
    "displayName should be reflected in SKU name",
    updatedSku.name,
    skuUpdateBody.displayName,
  );
  TestValidator.equals(
    "listPrice should be updated",
    updatedSku.listPrice,
    skuUpdateBody.listPrice,
  );
  TestValidator.equals(
    "salePrice should be updated",
    updatedSku.salePrice,
    skuUpdateBody.salePrice,
  );
  TestValidator.equals(
    "isActive flag should be updated",
    updatedSku.isActive,
    skuUpdateBody.isActive,
  );
  TestValidator.equals(
    "isPurchasable flag should be updated",
    updatedSku.isPurchasable,
    skuUpdateBody.isPurchasable,
  );

  // 14. Business rule: non-negative pricing respected
  TestValidator.predicate(
    "listPrice must remain non-negative",
    updatedSku.listPrice >= 0,
  );
  TestValidator.predicate(
    "salePrice must remain non-negative",
    updatedSku.salePrice >= 0,
  );
}
