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
import type { IShoppingMallProductRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRatingAggregate";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify public access and consistency of SKU-level rating aggregates for a
 * seller product under a brand.
 *
 * Business goal: Ensure that anyone (including unauthenticated guests) can
 * retrieve rating aggregates for a specific SKU of a branded product, and that
 * the aggregate object correctly references the product and SKU and has
 * logically consistent distribution/count fields.
 *
 * Steps:
 *
 * 1. Register and login as a platform admin.
 * 2. As platform admin, create a brand using /shoppingMall/platformAdmin/brands.
 * 3. Register and login as a seller.
 * 4. As seller, create a product associated with that brand using
 *    /shoppingMall/seller/products.
 * 5. As seller, create a SKU under that product using
 *    /shoppingMall/seller/products/{productCode}/skus.
 * 6. Build a guest connection (no Authorization header) based on the existing
 *    connection.
 * 7. Call GET /shoppingMall/products/{productId}/skus/{skuId}/ratingAggregates
 *    using the guest connection.
 * 8. Validate that the response is a well-formed
 *    IShoppingMallProductRatingAggregate whose product and sku summaries
 *    reference the created product and SKU, and that review counts and rating
 *    bucket counts are non-negative and coherent.
 */
export async function test_api_sku_rating_aggregates_public_access_with_brand_and_seller_product(
  connection: api.IConnection,
) {
  // 1. Register and login as platform admin (join already authenticates and sets Authorization header).
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
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
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register and login as seller.
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

  // Ensure seller login path is also working and refreshes Authorization for seller context.
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

  // 4. Create a product associated with that brand as seller.
  const productCode = `P-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create a SKU under that product.
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Build a guest (unauthenticated) connection: clone host/options but empty headers.
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Call rating aggregates as guest.
  const aggregate: IShoppingMallProductRatingAggregate =
    await api.functional.shoppingMall.products.skus.ratingAggregates.at(
      guestConnection,
      {
        productId: product.id,
        skuId: sku.id,
      },
    );
  typia.assert(aggregate);

  // 8. Business validations on aggregate structure and consistency.

  // 8.1. Product summary should reference created product ID.
  TestValidator.equals(
    "rating aggregate product.id should match created product.id",
    aggregate.product.id,
    product.id,
  );

  // 8.2. SKU summary (if present) should reference created SKU ID.
  if (aggregate.sku !== null && aggregate.sku !== undefined) {
    TestValidator.equals(
      "rating aggregate sku.id should match created sku.id when sku summary is present",
      aggregate.sku.id,
      sku.id,
    );
  }

  // 8.3. Count fields must be non-negative.
  const counts: number[] = [
    aggregate.review_count,
    aggregate.rating_1_count,
    aggregate.rating_2_count,
    aggregate.rating_3_count,
    aggregate.rating_4_count,
    aggregate.rating_5_count,
  ];

  counts.forEach((value, index) => {
    TestValidator.predicate(
      `rating aggregate count index ${index} should be non-negative`,
      value >= 0,
    );
  });

  // 8.4. Sum of bucket counts should equal review_count.
  const bucketSum =
    aggregate.rating_1_count +
    aggregate.rating_2_count +
    aggregate.rating_3_count +
    aggregate.rating_4_count +
    aggregate.rating_5_count;

  TestValidator.equals(
    "sum of rating_*_count buckets should equal review_count",
    bucketSum,
    aggregate.review_count,
  );

  // 8.5. average_rating (if present) should be within a plausible range, e.g., 0 to 5.
  if (
    aggregate.average_rating !== null &&
    aggregate.average_rating !== undefined
  ) {
    TestValidator.predicate(
      "average_rating should be between 0 and 5 inclusive when present",
      aggregate.average_rating >= 0 && aggregate.average_rating <= 5,
    );
  }
}
