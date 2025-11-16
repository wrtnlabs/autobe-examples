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
 * Validate that product detail responses embed seller and brand summaries
 * instead of low-level foreign keys, so storefronts can render merchant and
 * brand context in a single call.
 *
 * Business flow implemented in this test:
 *
 * 1. Platform admin joins (registers) and becomes authenticated.
 * 2. Platform admin creates a brand with a recognizable name, slug, and logo_uri.
 * 3. Seller joins (registers) and becomes authenticated.
 * 4. Seller creates two products using POST /shoppingMall/seller/products:
 *
 *    - One associated with the created brand (branded product).
 *    - One without any brand id (unbranded product).
 * 5. An anonymous client (no Authorization header) calls GET
 *    /shoppingMall/products/{productCode} for each product.
 * 6. For the branded product, verify that:
 *
 *    - The seller summary (IShoppingMallSeller.ISummary) matches the seller who
 *         created the product (id, email, store_name, status).
 *    - The brand summary (IShoppingMallBrand.ISummary) is non-null and its id, name,
 *         slug, and logo_url correspond to the brand created by the platform
 *         admin.
 *    - The product-level code and other core fields are preserved.
 * 7. For the unbranded product, verify that:
 *
 *    - The seller summary still matches the seller.
 *    - The brand field is null or undefined, indicating absence of brand.
 *
 * We do not test mutation of seller/brand data after creation because no update
 * APIs are provided in the current SDK; instead we focus on correctness of the
 * initial projection.
 */
export async function test_api_product_detail_includes_seller_and_brand_context(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a brand
  const brandSlugBase: string = RandomGenerator.alphaNumeric(8);
  const brandCreateBody = {
    name: `Brand ${brandSlugBase}`,
    slug: brandSlugBase,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.shoppingmall.local/logos/" + brandSlugBase + ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const createdBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(createdBrand);

  // 3. Seller joins and becomes authenticated
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Seller creates a branded product and an unbranded product
  const createCommonProductFields = () => {
    const code = RandomGenerator.alphaNumeric(12);
    const name = RandomGenerator.paragraph({ sentences: 3 });
    return { code, name };
  };

  const brandedProductCommon = createCommonProductFields();
  const brandedProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: createdBrand.id,
    code: brandedProductCommon.code,
    name: brandedProductCommon.name,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shoppingmall.local/products/" +
      brandedProductCommon.code +
      "/primary.jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const brandedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: brandedProductCreateBody,
    });
  typia.assert(brandedProduct);

  const unbrandedProductCommon = createCommonProductFields();
  const unbrandedProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: unbrandedProductCommon.code,
    name: unbrandedProductCommon.name,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const unbrandedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: unbrandedProductCreateBody,
    });
  typia.assert(unbrandedProduct);

  // 5. Prepare an anonymous connection (no Authorization header)
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Anonymous client fetches product detail for the branded product
  const brandedDetail: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(anonymousConnection, {
      productCode: brandedProduct.code,
    });
  typia.assert(brandedDetail);

  // Validate that product code round-trips
  TestValidator.equals(
    "branded product code should round-trip",
    brandedDetail.code,
    brandedProduct.code,
  );

  // Validate seller summary matches sellerAuthorized
  TestValidator.equals(
    "branded product seller summary id matches seller id",
    brandedDetail.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "branded product seller summary email matches seller email",
    brandedDetail.seller.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "branded product seller summary store_name matches seller store_name",
    brandedDetail.seller.store_name,
    sellerAuthorized.store_name,
  );
  TestValidator.equals(
    "branded product seller summary status matches seller status",
    brandedDetail.seller.status,
    sellerAuthorized.status,
  );

  // Validate brand summary is present and matches created brand
  TestValidator.predicate(
    "branded product should have non-null brand summary",
    brandedDetail.brand !== null && brandedDetail.brand !== undefined,
  );

  if (brandedDetail.brand !== null && brandedDetail.brand !== undefined) {
    TestValidator.equals(
      "branded product brand summary id matches created brand id",
      brandedDetail.brand.id,
      createdBrand.id,
    );
    TestValidator.equals(
      "branded product brand summary name matches created brand name",
      brandedDetail.brand.name,
      createdBrand.name,
    );
    TestValidator.equals(
      "branded product brand summary slug matches created brand slug",
      brandedDetail.brand.slug,
      createdBrand.slug,
    );
    TestValidator.equals(
      "branded product brand summary logo_url matches created brand logo_uri when present",
      brandedDetail.brand.logo_url,
      createdBrand.logo_uri ?? undefined,
    );
  }

  // 7. Anonymous client fetches product detail for the unbranded product
  const unbrandedDetail: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(anonymousConnection, {
      productCode: unbrandedProduct.code,
    });
  typia.assert(unbrandedDetail);

  // Validate product code round-trips for unbranded product
  TestValidator.equals(
    "unbranded product code should round-trip",
    unbrandedDetail.code,
    unbrandedProduct.code,
  );

  // Validate seller summary matches sellerAuthorized for unbranded product
  TestValidator.equals(
    "unbranded product seller summary id matches seller id",
    unbrandedDetail.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "unbranded product seller summary email matches seller email",
    unbrandedDetail.seller.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "unbranded product seller summary store_name matches seller store_name",
    unbrandedDetail.seller.store_name,
    sellerAuthorized.store_name,
  );
  TestValidator.equals(
    "unbranded product seller summary status matches seller status",
    unbrandedDetail.seller.status,
    sellerAuthorized.status,
  );

  // Validate brand is absent (null or undefined) for unbranded product
  TestValidator.predicate(
    "unbranded product should have null or undefined brand",
    unbrandedDetail.brand === null || unbrandedDetail.brand === undefined,
  );
}
