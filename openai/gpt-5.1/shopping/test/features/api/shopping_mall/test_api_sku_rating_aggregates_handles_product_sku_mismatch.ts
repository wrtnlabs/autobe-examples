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
 * Verify that SKU rating aggregates are correctly scoped to the owning product
 * and that cross-product productId/skuId mismatches are rejected, while valid
 * combinations remain accessible.
 *
 * Business flow:
 *
 * 1. Register and login a platform admin to manage brands.
 * 2. Register and login a seller to own products and SKUs.
 * 3. As platform admin, create a brand via POST
 *    /shoppingMall/platformAdmin/brands.
 * 4. As seller, create two products (A and B) under the same brand via POST
 *    /shoppingMall/seller/products, capturing their ids and codes.
 * 5. As seller, create one SKU under Product A (SKU A) and one under Product B
 *    (SKU B) via POST /shoppingMall/seller/products/{productCode}/skus.
 * 6. Using an unauthenticated connection, call GET
 *    /shoppingMall/products/{productId_B}/skus/{skuId_A}/ratingAggregates and
 *    assert that the backend rejects the mismatched pair with an HttpError.
 * 7. Also using an unauthenticated connection, call ratingAggregates for the
 *    correct pairs (Product A + SKU A, Product B + SKU B) and assert that valid
 *    IShoppingMallProductRatingAggregate objects are returned.
 */
export async function test_api_sku_rating_aggregates_handles_product_sku_mismatch(
  connection: api.IConnection,
) {
  // 1. Register and login platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register and login seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Explicit seller login to ensure auth switching works even if previous token existed
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shopping-mall.test/login",
    referrer: "https://seller.shopping-mall.test/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 3. Switch back to platform admin to create a brand
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shopping-mall.test/login",
    referrer: "https://admin.shopping-mall.test/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // Create a brand shared by both products
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri:
      "https://cdn.shopping-mall.test/logo/" + RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Switch to seller to create two products under same brand
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLogin);

  const productACode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;
  const productBCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;

  const productABody = {
    shopping_mall_seller_id: sellerReLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productACode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shopping-mall.test/product/" +
      RandomGenerator.alphaNumeric(16),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  const productBBody = {
    shopping_mall_seller_id: sellerReLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productBCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shopping-mall.test/product/" +
      RandomGenerator.alphaNumeric(16),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  // 5. Create SKU A under product A and SKU B under product B
  const skuABody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productA.code,
      body: skuABody,
    });
  typia.assert(skuA);

  const skuBBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 20000,
    salePrice: 15000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productB.code,
      body: skuBBody,
    });
  typia.assert(skuB);

  // Prepare an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Call ratingAggregates with mismatched productId_B and skuId_A
  await TestValidator.error(
    "mismatched productId/skuId pair should be rejected",
    async () => {
      await api.functional.shoppingMall.products.skus.ratingAggregates.at(
        unauthenticatedConnection,
        {
          productId: productB.id,
          skuId: skuA.id,
        },
      );
    },
  );

  // 7. Control: correct pair product A + SKU A
  const aggregateA: IShoppingMallProductRatingAggregate =
    await api.functional.shoppingMall.products.skus.ratingAggregates.at(
      unauthenticatedConnection,
      {
        productId: productA.id,
        skuId: skuA.id,
      },
    );
  typia.assert(aggregateA);

  TestValidator.equals(
    "aggregateA.product.id should match productA.id",
    aggregateA.product.id,
    productA.id,
  );

  // Control: correct pair product B + SKU B
  const aggregateB: IShoppingMallProductRatingAggregate =
    await api.functional.shoppingMall.products.skus.ratingAggregates.at(
      unauthenticatedConnection,
      {
        productId: productB.id,
        skuId: skuB.id,
      },
    );
  typia.assert(aggregateB);

  TestValidator.equals(
    "aggregateB.product.id should match productB.id",
    aggregateB.product.id,
    productB.id,
  );
}
