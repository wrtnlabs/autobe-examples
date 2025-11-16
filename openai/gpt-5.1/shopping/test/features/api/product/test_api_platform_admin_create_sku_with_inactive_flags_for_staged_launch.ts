import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_create_sku_with_inactive_flags_for_staged_launch(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a brand under platformAdmin context
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Create an active multi-SKU product
  const productCode = `PROD-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Multi SKU Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code should match request",
    product.code,
    productCode,
  );

  // 4. Create two SKUs with different lifecycle flags
  const sku1Body = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU Inactive Visible Flag ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: false,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: sku1Body,
      },
    );
  typia.assert<IShoppingMallProductSku>(sku1);

  TestValidator.equals(
    "sku1 code should match request",
    sku1.code,
    sku1Body.code,
  );
  TestValidator.equals(
    "sku1 name should match request",
    sku1.name,
    sku1Body.name,
  );
  TestValidator.equals(
    "sku1 listPrice should match request",
    sku1.listPrice,
    sku1Body.listPrice,
  );
  TestValidator.equals(
    "sku1 salePrice should match request",
    sku1.salePrice,
    sku1Body.salePrice,
  );
  TestValidator.equals(
    "sku1 currency should match request",
    sku1.currency,
    sku1Body.currency,
  );
  TestValidator.equals(
    "sku1 isActive should be false",
    sku1.isActive,
    sku1Body.isActive,
  );
  TestValidator.equals(
    "sku1 isPurchasable should be true",
    sku1.isPurchasable,
    sku1Body.isPurchasable,
  );
  TestValidator.equals(
    "sku1 productCode should match parent product code",
    sku1.productCode,
    product.code,
  );

  const sku2Body = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU Non-purchasable ${RandomGenerator.name(1)}`,
    listPrice: 15000,
    salePrice: 15000,
    currency: "KRW",
    isActive: true,
    isPurchasable: false,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: sku2Body,
      },
    );
  typia.assert<IShoppingMallProductSku>(sku2);

  TestValidator.equals(
    "sku2 code should match request",
    sku2.code,
    sku2Body.code,
  );
  TestValidator.equals(
    "sku2 name should match request",
    sku2.name,
    sku2Body.name,
  );
  TestValidator.equals(
    "sku2 listPrice should match request",
    sku2.listPrice,
    sku2Body.listPrice,
  );
  TestValidator.equals(
    "sku2 salePrice should match request",
    sku2.salePrice,
    sku2Body.salePrice,
  );
  TestValidator.equals(
    "sku2 currency should match request",
    sku2.currency,
    sku2Body.currency,
  );
  TestValidator.equals(
    "sku2 isActive should be true",
    sku2.isActive,
    sku2Body.isActive,
  );
  TestValidator.equals(
    "sku2 isPurchasable should be false",
    sku2.isPurchasable,
    sku2Body.isPurchasable,
  );
  TestValidator.equals(
    "sku2 productCode should match parent product code",
    sku2.productCode,
    product.code,
  );

  // 5. Ensure SKUs are distinct variants
  TestValidator.notEquals(
    "sku1 and sku2 codes must be different",
    sku1.code,
    sku2.code,
  );
  TestValidator.notEquals(
    "sku1 and sku2 names must be different",
    sku1.name,
    sku2.name,
  );
}
