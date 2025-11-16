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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate seller-side product creation with an existing brand.
 *
 * Business goal
 *
 * - Ensure that a platform admin can register a brand, and then a seller can
 *   create a product that references that brand through
 *   shopping_mall_brand_id.
 * - Confirm that the created product materializes seller and brand BELONGS-TO
 *   relations as summary objects (seller: IShoppingMallSeller.ISummary, brand:
 *   IShoppingMallBrand.ISummary) and that they match the previously created
 *   entities.
 *
 * High level flow
 *
 * 1. Platform admin join (POST /auth/platformAdmin/join) to obtain an
 *    authenticated platform-admin connection.
 * 2. Admin creates a brand (POST /shoppingMall/platformAdmin/brands) with unique
 *    name and slug.
 * 3. Seller join (POST /auth/seller/join) to obtain an authenticated seller
 *    connection.
 * 4. Seller creates product (POST /shoppingMall/seller/products) with:
 *
 *    - Shopping_mall_seller_id = seller.id
 *    - Shopping_mall_brand_id = createdBrand.id
 *    - Other fields (code, name, status, is_multi_sku, etc.) filled with random
 *         values.
 * 5. Validate:
 *
 *    - Typia.assert on the created IShoppingMallProduct
 *    - Product.seller.id equals seller.id and product.seller.store_name equals
 *         seller.store_name
 *    - Product.brand is non-null and its id/name/slug/logo_url match the created
 *         brand (id/name/slug/logo_uri).
 */
export async function test_api_seller_product_creation_with_brand(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin creates a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(12)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Seller creates product linked to the brand
  const productCode: string & tags.MinLength<1> =
    `P-${RandomGenerator.alphaNumeric(16)}` as string & tags.MinLength<1>;
  const productName: string & tags.MinLength<1> =
    `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>;
  const status: string & tags.MinLength<1> = "active" as string &
    tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: productName,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(16),
    additional_data: JSON.stringify({
      tags: ["e2e", "brand-link"],
      source: "test_api_seller_product_creation_with_brand",
    }),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Business linkage validation
  // 5-1. Seller summary
  TestValidator.equals(
    "product.seller.id must equal authenticated seller id",
    product.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "product.seller.store_name must equal authenticated seller store_name",
    product.seller.store_name,
    seller.store_name,
  );

  // 5-2. Brand summary
  TestValidator.predicate(
    "product.brand must be non-null",
    product.brand !== null && product.brand !== undefined,
  );

  if (product.brand !== null && product.brand !== undefined) {
    TestValidator.equals(
      "product.brand.id must equal created brand id",
      product.brand.id,
      brand.id,
    );
    TestValidator.equals(
      "product.brand.name must equal created brand name",
      product.brand.name,
      brand.name,
    );
    TestValidator.equals(
      "product.brand.slug must equal created brand slug",
      product.brand.slug,
      brand.slug,
    );

    // logo_url in summary should reflect logo_uri of full brand when present
    if (brand.logo_uri !== undefined) {
      TestValidator.equals(
        "product.brand.logo_url must equal created brand logo_uri when present",
        product.brand.logo_url,
        brand.logo_uri,
      );
    }
  }
}
