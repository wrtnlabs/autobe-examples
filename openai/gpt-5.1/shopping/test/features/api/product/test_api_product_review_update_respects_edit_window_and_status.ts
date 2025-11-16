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
 * Validate that updating a product review respects authorship-based edit rules.
 *
 * Business goal (adapted to available APIs):
 *
 * - A customer (Customer A) can successfully update their own review for a given
 *   product SKU.
 * - A different customer (Customer B) cannot update a review authored by Customer
 *   A, even when sending a structurally valid update body.
 *
 * High-level flow:
 *
 * 1. Register and authenticate a platform admin.
 * 2. Register and authenticate a seller.
 * 3. Register and authenticate two customers: Customer A and Customer B.
 * 4. As platform admin, create a category tree and a brand (catalog context).
 * 5. As seller, create a seller-owned product.
 * 6. As platform admin, create a catalog product bound to the seller and brand.
 * 7. As platform admin, create a SKU under that product.
 * 8. As Customer A, create Review A for the product+SKU.
 * 9. As Customer A, update Review A and verify that the returned review reflects
 *    the new rating/title/body.
 * 10. As Customer B, create Review B for the same product+SKU.
 * 11. As Customer A (non-author of Review B), attempt to update Review B and verify
 *     that an error is thrown.
 */
export async function test_api_product_review_update_respects_edit_window_and_status(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin.
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register and authenticate a seller.
  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@seller.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    storeName: `Store-${RandomGenerator.alphabets(8)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Register and authenticate two customers: A and B.
  const customerAJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@customer.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuthorized);

  const customerBJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@customer.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuthorized);

  // 4. As platform admin, create a category tree and a brand.
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: "Primary category tree for tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: "Test brand for product review update scenario",
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. As seller, create a seller-owned product.
  const sellerProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: `PROD-${RandomGenerator.alphaNumeric(10)}`,
    name: "Seller Product for Review Test",
    short_description: "Short description for review update test product",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-main.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  // 6. As platform admin, create a catalog product bound to the same seller and brand.
  const platformAdminProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: `CAT-${RandomGenerator.alphaNumeric(10)}`,
    name: "Catalog Product for Review Test",
    short_description: "Catalog product used for SKU and reviews",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/catalog-product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const catalogProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: platformAdminProductBody,
      },
    );
  typia.assert(catalogProduct);

  // 7. As platform admin, create a SKU for the catalog product.
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
    name: "Default Test SKU",
    listPrice: 199.99,
    salePrice: 149.99,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: catalogProduct.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  const productId: string = catalogProduct.id;
  const skuId: string = sku.id;

  // 8. As Customer A, create Review A.
  const reviewACreateBody = {
    rating: 4 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewA: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId,
        skuId,
        body: reviewACreateBody,
      },
    );
  typia.assert(reviewA);

  const originalReviewAId: string = reviewA.id;
  const originalReviewACreatedAt: string = reviewA.createdAt;
  const originalReviewAUpdatedAt: string = reviewA.updatedAt;

  // 9. As Customer A, update Review A.
  const reviewAUpdateBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Updated review title for Customer A",
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 9,
    }),
    is_public: true,
  } satisfies IShoppingMallProductReview.IUpdate;

  const updatedReviewA: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.update(
      connection,
      {
        productId,
        skuId,
        reviewId: originalReviewAId,
        body: reviewAUpdateBody,
      },
    );
  typia.assert(updatedReviewA);

  // Business assertions for successful self-update.
  TestValidator.equals(
    "review A id should remain the same after update",
    updatedReviewA.id,
    originalReviewAId,
  );

  TestValidator.equals(
    "review A rating should be updated to 5",
    updatedReviewA.rating,
    reviewAUpdateBody.rating,
  );

  TestValidator.equals(
    "review A title should match updated title",
    updatedReviewA.title,
    reviewAUpdateBody.title,
  );

  TestValidator.equals(
    "review A body should match updated body",
    updatedReviewA.body,
    reviewAUpdateBody.body,
  );

  TestValidator.predicate(
    "review A updatedAt should be >= original updatedAt",
    new Date(updatedReviewA.updatedAt).getTime() >=
      new Date(originalReviewAUpdatedAt).getTime(),
  );

  TestValidator.predicate(
    "review A updatedAt should be >= createdAt",
    new Date(updatedReviewA.updatedAt).getTime() >=
      new Date(originalReviewACreatedAt).getTime(),
  );

  // 10. As Customer B, create Review B for the same product+SKU.
  const reviewBCreateBody = {
    rating: 3 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Customer B initial title",
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallProductReview.ICreate;

  const reviewB: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId,
        skuId,
        body: reviewBCreateBody,
      },
    );
  typia.assert(reviewB);

  const reviewBUpdateBody = {
    rating: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Attempted hijack of Customer B review",
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 9,
      wordMin: 3,
      wordMax: 8,
    }),
    is_public: true,
  } satisfies IShoppingMallProductReview.IUpdate;

  // 11. As Customer A (non-author), attempt to update Review B and expect an error.
  await TestValidator.error(
    "customer A cannot update review authored by customer B",
    async () => {
      await api.functional.shoppingMall.customer.products.skus.reviews.update(
        connection,
        {
          productId,
          skuId,
          reviewId: reviewB.id,
          body: reviewBUpdateBody,
        },
      );
    },
  );
}
