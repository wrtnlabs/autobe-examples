import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that platform-admin review erasure is scoped by product and SKU.
 *
 * Business goal: Ensure that DELETE
 * /shoppingMall/platformAdmin/products/{productId}/skus/{skuId}/reviews/{reviewId}
 * only erases a review when the review actually belongs to the given
 * (productId, skuId) combination, and that a mismatched product/SKU context
 * cannot accidentally delete a review from another product.
 *
 * Scenario implemented with available APIs:
 *
 * 1. Register & authenticate three actors:
 *
 *    - Platform admin (catalog moderation authority)
 *    - Seller (owns products)
 *    - Customer (writes reviews)
 * 2. As platform admin, create two catalog products (Product A and Product B) via
 *    platformAdmin.products.create, both associated with the seller's id.
 * 3. As platform admin, create one SKU for each product via
 *    platformAdmin.products.skus.create → SKU A1 for Product A, SKU B1 for
 *    Product B.
 * 4. As customer, create two reviews via customer.products.skus.reviews.create:
 *
 *    - Review A: for (productId = ProductA.id, skuId = A1.id)
 *    - Review B: for (productId = ProductB.id, skuId = B1.id)
 * 5. As platform admin, attempt to erase Review A using a mismatched product/SKU
 *    context: (productId = ProductB.id, skuId = B1.id, reviewId = ReviewA.id).
 *    This must fail with an HttpError (not-found or equivalent), and must not
 *    delete Review A.
 * 6. Finally, call erase again with the correct (productId, skuId, reviewId)
 *    triple for Review A and verify that this time it succeeds (no error).
 *
 * Due to available SDK limitations, we cannot re-fetch reviews or aggregates,
 * so we validate behavior purely through error vs. success of the erase calls.
 */
export async function test_api_platform_admin_erase_review_not_cross_product(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticated)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register seller (auto-authenticated as seller)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // We need seller id for products.
  const sellerId = sellerAuthorized.id;

  // 3. Register customer (auto-authenticated)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Switch back to platform admin to manage catalog
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminAfterLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAfterLogin);

  // 5. Optionally create a brand to associate with products
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/brand/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 6. Create Product A and Product B under the seller, via platformAdmin
  const productACode = `PROD-A-${RandomGenerator.alphaNumeric(8)}`;
  const productARequest = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productACode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product/a/primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productARequest,
      },
    );
  typia.assert(productA);

  const productBCode = `PROD-B-${RandomGenerator.alphaNumeric(8)}`;
  const productBRequest = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productBCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product/b/primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBRequest,
      },
    );
  typia.assert(productB);

  // 7. Create SKU A1 for Product A and SKU B1 for Product B via platform admin
  const skuARequest = {
    code: `SKU-A1-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: productA.code,
        body: skuARequest,
      },
    );
  typia.assert(skuA);

  const skuBRequest = {
    code: `SKU-B1-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    listPrice: 20000,
    salePrice: 18000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: productB.code,
        body: skuBRequest,
      },
    );
  typia.assert(skuB);

  // 8. Switch to customer to create reviews
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/home",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAfterLogin);

  // Review A for (Product A, SKU A1)
  const reviewABody = {
    rating: 5,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewA: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: productA.id,
        skuId: skuA.id,
        body: reviewABody,
      },
    );
  typia.assert(reviewA);

  // Review B for (Product B, SKU B1)
  const reviewBBody = {
    rating: 4,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewB: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: productB.id,
        skuId: skuB.id,
        body: reviewBBody,
      },
    );
  typia.assert(reviewB);

  // 9. Switch to platform admin again to perform erase operations
  const platformAdminLoginForErase = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminForErase: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginForErase,
    });
  typia.assert(platformAdminForErase);

  // 10. Attempt cross-product erase: productB/skuB with reviewA.id must fail
  await TestValidator.error("cross-product erase must fail", async () => {
    await api.functional.shoppingMall.platformAdmin.products.skus.reviews.erase(
      connection,
      {
        productId: productB.id,
        skuId: skuB.id,
        reviewId: reviewA.id,
      },
    );
  });

  // 11. Correctly scoped erase: productA/skuA with reviewA.id must succeed
  await api.functional.shoppingMall.platformAdmin.products.skus.reviews.erase(
    connection,
    {
      productId: productA.id,
      skuId: skuA.id,
      reviewId: reviewA.id,
    },
  );

  // If we reached here without error, we consider behavior validated.
  TestValidator.predicate(
    "erase endpoint enforces product/sku scoping for reviews",
    true,
  );
}
