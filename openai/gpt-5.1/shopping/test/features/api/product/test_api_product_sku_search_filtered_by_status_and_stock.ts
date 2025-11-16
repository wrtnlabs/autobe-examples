import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
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

export async function test_api_product_sku_search_filtered_by_status_and_stock(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: "AdminPassword!234",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoined: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoined);

  // explicit login (actor switch safety)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Category tree creation
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. Brand creation
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Seller join & login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassword!234",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorizedFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorizedFromJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorized);

  // 5. Create product (owned by seller, branded)
  const productCode: string & tags.MinLength<1> =
    `PRODUCT-${RandomGenerator.alphaNumeric(8)}`;

  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Test Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active", // arbitrary non-empty string
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Define option type (Color) and values (Red, Blue)
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const redOptionValueBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const blueOptionValueBody = {
    value: "BLUE",
    display_name: "Blue",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const redOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: redOptionValueBody,
      },
    );
  typia.assert(redOptionValue);

  const blueOptionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: blueOptionValueBody,
      },
    );
  typia.assert(blueOptionValue);

  // 7. Switch back to platform admin for SKU creation
  const platformAdminReLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminReLogin);

  // Helper to build SKU body
  const makeSkuBody = (
    code: string,
    isActive: boolean,
    isPurchasable: boolean,
  ): IShoppingMallProductSku.ICreate =>
    ({
      code,
      name: `${product.name} - ${code}`,
      listPrice: 10000,
      salePrice: 9000,
      currency: "KRW",
      isActive,
      isPurchasable,
    }) satisfies IShoppingMallProductSku.ICreate;

  const skuActive1Body = makeSkuBody("SKU-ACTIVE-1", true, true);
  const skuActive2Body = makeSkuBody("SKU-ACTIVE-2", true, true);
  const skuInactiveBody = makeSkuBody("SKU-INACTIVE", false, false);

  const skuActive1: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuActive1Body,
      },
    );
  typia.assert(skuActive1);

  const skuActive2: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuActive2Body,
      },
    );
  typia.assert(skuActive2);

  const skuInactive: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuInactiveBody,
      },
    );
  typia.assert(skuInactive);

  // 8. Switch back to seller and create inventory only for active SKUs
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLogin);

  const makeInventoryBody = (
    productSkuId: string & tags.Format<"uuid">,
    onHand: number & tags.Type<"int32"> & tags.Minimum<0>,
  ): IShoppingMallInventoryItem.ICreate =>
    ({
      product_sku_id: productSkuId,
      on_hand_quantity: onHand,
      low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      backorder_enabled: false,
      preorder_enabled: false,
    }) satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryActive1Body = makeInventoryBody(
    skuActive1.id,
    10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  const inventoryActive2Body = makeInventoryBody(
    skuActive2.id,
    5 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  const inventoryActive1: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryActive1Body,
    });
  typia.assert(inventoryActive1);

  const inventoryActive2: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryActive2Body,
    });
  typia.assert(inventoryActive2);

  // 9. Call SKU search endpoint with status + in_stock_only = true
  const skuSearchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    status: "active",
    in_stock_only: true,
  } satisfies IShoppingMallProductSku.IRequest;

  const pageSkus: IPageIShoppingMallProductSku.ISummary =
    await api.functional.shoppingMall.products.skus.index(connection, {
      productCode: product.code,
      body: skuSearchRequest,
    });
  typia.assert(pageSkus);

  const { pagination, data } = pageSkus;

  // Basic pagination sanity checks
  TestValidator.predicate(
    "pagination.limit should be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records should be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length should be <= pagination.limit",
    data.length <= pagination.limit,
  );

  // There should be at least one active, in-stock SKU
  TestValidator.predicate(
    "at least one SKU returned for active & in-stock filter",
    data.length >= 1,
  );

  const expectedActiveCodes = [skuActive1.code, skuActive2.code] as const;
  const inactiveCode = skuInactive.code;

  // All returned SKUs must be among active ones and not the inactive one
  for (const summary of data) {
    TestValidator.predicate(
      "returned SKU must be one of active SKUs",
      expectedActiveCodes.includes(summary.code),
    );
    TestValidator.predicate(
      "inactive SKU must not be returned",
      summary.code !== inactiveCode,
    );
  }
}
