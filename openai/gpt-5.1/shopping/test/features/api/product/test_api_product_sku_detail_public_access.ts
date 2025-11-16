import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that detailed SKU variant information is publicly accessible by
 * productCode and skuCode.
 *
 * Business goal:
 *
 * - Ensure that a concrete SKU variant created under a seller-owned product can
 *   be retrieved by anonymous storefront clients using only the productCode and
 *   skuCode pair.
 * - Confirm that the endpoint returns a fully enriched SKU DTO with correct
 *   pricing flags and an embedded product summary (including brand) suitable
 *   for product detail pages.
 *
 * End-to-end steps:
 *
 * 1. Register and authenticate a platform admin (for brand creation capability).
 * 2. Using platform admin, create a brand via POST
 *    /shoppingMall/platformAdmin/brands.
 * 3. Register and authenticate a seller.
 * 4. As seller, create a product via POST /shoppingMall/seller/products with:
 *
 *    - A unique business productCode.
 *    - Association to the created brand via its UUID.
 *    - Status configured as active and is_multi_sku set to true.
 * 5. As seller, create a SKU under that product via POST
 *    /shoppingMall/seller/products/{productCode}/skus with:
 *
 *    - A chosen skuCode string.
 *    - ListPrice, salePrice, currency.
 *    - IsActive and isPurchasable flags explicitly set to true.
 * 6. Construct a new unauthenticated connection object (same host, simulate, etc.)
 *    but with headers: {} so that no Authorization header is present.
 * 7. Call GET /shoppingMall/products/{productCode}/skus/{skuCode} via
 *    api.functional.shoppingMall.products.skus.at using the unauthenticated
 *    connection.
 * 8. Validate response semantics:
 *
 *    - Typia.assert on returned IShoppingMallProductSku for structural safety.
 *    - Sku.code equals the created skuCode.
 *    - Sku.productCode equals the created productCode.
 *    - Sku.listPrice and sku.salePrice equal the values used on creation.
 *    - Sku.currency matches the created currency.
 *    - Sku.isActive and sku.isPurchasable are true.
 *    - Sku.product.id equals the created product.id.
 *    - Sku.product.name equals the product.name.
 *    - Sku.product.brand, when defined, has id/slug/name consistent with the created
 *         brand summary (note: summary type exposes id, name, slug, logo_url
 *         only).
 *
 * This test does NOT validate negative scenarios (e.g., inactive SKUs or
 * non-existent codes), nor does it assert HTTP status codes directly. It
 * strictly validates the happy path for an active, purchasable SKU and the
 * correctness of the joined product context in a public storefront read.
 */
export async function test_api_product_sku_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also authenticates and sets Authorization).
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin.
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shopping-mall.test/logos/" +
      RandomGenerator.alphaNumeric(12) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register a seller.
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Create a product as seller associated with the brand.
  //    Use sellerAuthorized.id as shopping_mall_seller_id.
  const productCode: string & tags.MinLength<1> =
    `SKU-TEST-${RandomGenerator.alphaNumeric(8)}` satisfies string as string;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shopping-mall.test/products/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product code should match created code",
    product.code,
    productCode,
  );

  // 5. Create a SKU for that product as seller.
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const listPrice = 10000;
  const salePrice = 9000;
  const currency = "KRW";

  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} Variant`,
    listPrice,
    salePrice,
    currency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const createdSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(createdSku);

  TestValidator.equals(
    "created SKU code should equal requested skuCode",
    createdSku.code,
    skuCode,
  );

  // 6. Build an unauthenticated connection for public storefront access.
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Publicly GET the SKU detail by productCode and skuCode.
  const publicSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.products.skus.at(publicConnection, {
      productCode: product.code,
      skuCode,
    });
  typia.assert(publicSku);

  // 8. Validate core business semantics on the returned SKU.
  TestValidator.equals(
    "public SKU id should match created SKU id",
    publicSku.id,
    createdSku.id,
  );

  TestValidator.equals(
    "public SKU code should match created skuCode",
    publicSku.code,
    skuCode,
  );

  TestValidator.equals(
    "public SKU productCode should match product.code",
    publicSku.productCode,
    product.code,
  );

  TestValidator.equals(
    "public SKU listPrice should equal created listPrice",
    publicSku.listPrice,
    listPrice,
  );

  TestValidator.equals(
    "public SKU salePrice should equal created salePrice",
    publicSku.salePrice,
    salePrice,
  );

  TestValidator.equals(
    "public SKU currency should equal created currency",
    publicSku.currency,
    currency,
  );

  TestValidator.predicate(
    "public SKU isActive should be true",
    publicSku.isActive === true,
  );

  TestValidator.predicate(
    "public SKU isPurchasable should be true",
    publicSku.isPurchasable === true,
  );

  // Validate embedded product summary.
  TestValidator.equals(
    "public SKU product summary id should match product id",
    publicSku.product.id,
    product.id,
  );

  TestValidator.equals(
    "public SKU product summary name should match product name",
    publicSku.product.name,
    product.name,
  );

  // If brand information is present in the product summary, check consistency
  // with the originally created brand.
  if (publicSku.product.brand) {
    TestValidator.equals(
      "product summary brand id should match created brand id",
      publicSku.product.brand.id,
      brand.id,
    );

    TestValidator.equals(
      "product summary brand name should match created brand name",
      publicSku.product.brand.name,
      brand.name,
    );

    TestValidator.equals(
      "product summary brand slug should match created brand slug",
      publicSku.product.brand.slug,
      brand.slug,
    );
  }
}
