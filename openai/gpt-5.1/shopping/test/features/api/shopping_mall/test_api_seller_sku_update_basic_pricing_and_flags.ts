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

export async function test_api_seller_sku_update_basic_pricing_and_flags(
  connection: api.IConnection,
) {
  // 1. Register a new seller and get authorized context
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
  typia.assert(sellerAuthorized);

  // 2. Register a platform admin and get authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platform admin, create brand and category tree
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 4. As platform admin, create a base product owned by the seller
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const adminProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductCreateBody,
      },
    );
  typia.assert(adminProduct);

  TestValidator.equals(
    "product code must match requested code",
    adminProduct.code,
    productCode,
  );

  // 5. As platform admin, create an initial SKU under this product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;

  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.name(3),
    listPrice: 20000,
    salePrice: 15000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const originalSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(originalSku);

  TestValidator.equals(
    "created SKU should belong to the product code",
    originalSku.productCode,
    productCode,
  );
  TestValidator.equals(
    "created SKU code should match requested code",
    originalSku.code,
    skuCode,
  );

  // 6. Re-login as seller to ensure seller context (token) is active
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  TestValidator.equals(
    "seller id after login should equal joined seller id",
    sellerLoggedIn.id,
    sellerAuthorized.id,
  );

  // 7. As seller, update SKU pricing, flags, and SEO/metadata
  const updatedListPrice = 25000;
  const updatedSalePrice = 22000;
  const updatedIsActive = false;
  const updatedIsPurchasable = false;

  const channelVisibilityUpdate = {
    web: true,
    mobile: false,
    marketplace: true,
  } satisfies IShoppingMallProductSkuChannelVisibility.IUpdate;

  const metadataUpdate = {
    campaign: "spring-sale",
    badge: "limited",
  } satisfies IShoppingMallProductSkuMetadata.IUpdate;

  const skuUpdateBody = {
    displayName: RandomGenerator.name(3),
    listPrice: updatedListPrice,
    salePrice: updatedSalePrice,
    isActive: updatedIsActive,
    isPurchasable: updatedIsPurchasable,
    channelVisibility: channelVisibilityUpdate,
    seoTitle: RandomGenerator.paragraph({ sentences: 3 }),
    seoDescription: RandomGenerator.paragraph({ sentences: 6 }),
    metadata: metadataUpdate,
  } satisfies IShoppingMallProductSku.IUpdate;

  const updatedSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productCode,
      skuCode,
      body: skuUpdateBody,
    });
  typia.assert(updatedSku);

  // 8. Validate pricing and flags updated correctly
  TestValidator.equals(
    "updated listPrice should match request body",
    updatedSku.listPrice,
    updatedListPrice,
  );
  TestValidator.equals(
    "updated salePrice should match request body",
    updatedSku.salePrice,
    updatedSalePrice,
  );
  TestValidator.equals(
    "updated isActive flag should match request body",
    updatedSku.isActive,
    updatedIsActive,
  );
  TestValidator.equals(
    "updated isPurchasable flag should match request body",
    updatedSku.isPurchasable,
    updatedIsPurchasable,
  );

  // 9. Validate identity fields are preserved
  TestValidator.equals(
    "SKU id must remain unchanged after update",
    updatedSku.id,
    originalSku.id,
  );
  TestValidator.equals(
    "SKU code must remain unchanged after update",
    updatedSku.code,
    originalSku.code,
  );
  TestValidator.equals(
    "SKU productCode must remain unchanged after update",
    updatedSku.productCode,
    originalSku.productCode,
  );

  TestValidator.equals(
    "SKU product summary id should remain equal to original product id",
    updatedSku.product.id,
    adminProduct.id,
  );
}
