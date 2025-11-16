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
 * Validate SKU creation for a product associated with a brand.
 *
 * Business goal:
 *
 * - Ensure that platform admins can register brands, sellers can create products
 *   associated with those brands, and that seller-created SKUs for such
 *   products carry through brand summary information in the returned
 *   SKU.product summary.
 *
 * Steps:
 *
 * 1. Register a platform admin via auth.platformAdmin.join and automatically
 *    authenticate.
 * 2. As the admin, create a brand via shoppingMall.platformAdmin.brands.create.
 * 3. Register a seller via auth.seller.join and automatically authenticate as that
 *    seller.
 * 4. As the seller, create a product using shoppingMall.seller.products.create
 *    with:
 *
 *    - Shopping_mall_seller_id = seller.id
 *    - Shopping_mall_brand_id = createdBrand.id
 *    - A unique business code and basic product attributes
 * 5. As the same seller session, create a SKU for that product via
 *    shoppingMall.seller.products.skus.create(productCode,
 *    IShoppingMallProductSku.ICreate body).
 * 6. Validate that:
 *
 *    - The product response has brand present and matching the created brand.
 *    - The SKU response typia.assert passes and sku.product.code == product.code.
 *    - Sku.product.brand is defined and matches the created brand summary
 *         (id/name/slug).
 */
export async function test_api_seller_create_sku_with_brand_associated_product(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "AdminPass!234",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(10)}`;
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register seller (join automatically authenticates seller)
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "SellerPass!234",
    storeName: `Store-${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. As seller, create a product associated with the brand
  const productCode = `PROD-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/products/" + RandomGenerator.alphaNumeric(16),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Validate that product has brand summary matching created brand
  TestValidator.predicate(
    "product.brand must be present for branded product",
    product.brand !== undefined && product.brand !== null,
  );

  if (product.brand !== undefined && product.brand !== null) {
    TestValidator.equals(
      "product.brand.id matches created brand.id",
      product.brand.id,
      brand.id,
    );
    TestValidator.equals(
      "product.brand.name matches created brand.name",
      product.brand.name,
      brand.name,
    );
    TestValidator.equals(
      "product.brand.slug matches created brand.slug",
      product.brand.slug,
      brand.slug,
    );
  }

  // 5. As same seller session, create a SKU under that product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 8900,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Verify SKU business and relational consistency
  TestValidator.equals("sku.code matches requested skuCode", sku.code, skuCode);
  TestValidator.equals(
    "sku.productCode matches requested productCode",
    sku.productCode,
    productCode,
  );

  // Validate embedded product summary
  TestValidator.equals(
    "sku.product.id matches created product.id",
    sku.product.id,
    product.id,
  );
  TestValidator.equals(
    "sku.product.name matches created product.name",
    sku.product.name,
    product.name,
  );

  TestValidator.predicate(
    "sku.product.brand must be present on product summary for branded product",
    sku.product.brand !== undefined,
  );

  if (sku.product.brand !== undefined) {
    TestValidator.equals(
      "sku.product.brand.id matches created brand.id",
      sku.product.brand.id,
      brand.id,
    );
    TestValidator.equals(
      "sku.product.brand.name matches created brand.name",
      sku.product.brand.name,
      brand.name,
    );
    TestValidator.equals(
      "sku.product.brand.slug matches created brand.slug",
      sku.product.brand.slug,
      brand.slug,
    );
  }
}
