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
 * Role-enforced erase review scenario for platform admin.
 *
 * This E2E test validates that:
 *
 * - Only platformAdmin actors can successfully call DELETE
 *   /shoppingMall/platformAdmin/products/{productId}/skus/{skuId}/reviews/{reviewId}.
 * - Customer and seller actors receive authorization failures and cannot erase
 *   reviews via this endpoint.
 * - Unauthorized attempts do not cause side effects: the review still exists and
 *   can be erased later by a platformAdmin.
 * - Once erased by the platformAdmin, a second erase attempt fails, implying that
 *   the resource was removed.
 */
export async function test_api_platform_admin_erase_review_role_enforced(
  connection: api.IConnection,
) {
  // -------------------------------------------------------------------------
  // 1. Multi-actor authentication setup
  // -------------------------------------------------------------------------
  const baseHref = "https://example.com/join" as const;
  const baseReferrer = "https://example.com/" as const;

  // 1-1. Register platform admin
  const platformAdminEmail = `${RandomGenerator.alphabets(8)}@admin.test`;
  const platformAdminPassword = "Admin#1234";

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1-2. Register seller
  const sellerEmail = `${RandomGenerator.alphabets(8)}@seller.test`;
  const sellerPassword = "Seller#1234";

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 1-3. Register customer
  const customerEmail = `${RandomGenerator.alphabets(8)}@customer.test`;
  const customerPassword = "Customer#1234";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // -------------------------------------------------------------------------
  // 2. Catalog setup as platform admin (brand, product, sku)
  // -------------------------------------------------------------------------
  // Ensure platformAdmin is the active actor
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminAfterLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAfterLogin);

  // 2-1. Create a brand
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 2-2. Create a product under the seller
  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 2-3. Create a SKU under that product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // -------------------------------------------------------------------------
  // 3. Customer creates a review for the product/SKU
  // -------------------------------------------------------------------------
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
    userAgent: undefined,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAfterLogin);

  const reviewCreateBody = {
    rating: 5,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: reviewCreateBody,
      },
    );
  typia.assert(review);

  const productId = product.id;
  const skuId = sku.id;
  const reviewId = review.id;

  // -------------------------------------------------------------------------
  // 4. Customer attempts to erase review via platformAdmin endpoint (must fail)
  // -------------------------------------------------------------------------
  await TestValidator.error(
    "customer cannot erase review via platformAdmin endpoint",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.skus.reviews.erase(
        connection,
        {
          productId,
          skuId,
          reviewId,
        },
      );
    },
  );

  // -------------------------------------------------------------------------
  // 5. Seller attempts to erase review via platformAdmin endpoint (must fail)
  // -------------------------------------------------------------------------
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAfterLogin);

  await TestValidator.error(
    "seller cannot erase review via platformAdmin endpoint",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.skus.reviews.erase(
        connection,
        {
          productId,
          skuId,
          reviewId,
        },
      );
    },
  );

  // -------------------------------------------------------------------------
  // 6. Platform admin successfully erases the review
  // -------------------------------------------------------------------------
  const platformAdminLoginAgainBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminAfterLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginAgainBody,
    });
  typia.assert(platformAdminAfterLoginAgain);

  // Successful erase should not throw
  await api.functional.shoppingMall.platformAdmin.products.skus.reviews.erase(
    connection,
    {
      productId,
      skuId,
      reviewId,
    },
  );

  // -------------------------------------------------------------------------
  // 7. Second erase attempt as platformAdmin must fail (already erased)
  // -------------------------------------------------------------------------
  await TestValidator.error("cannot erase already erased review", async () => {
    await api.functional.shoppingMall.platformAdmin.products.skus.reviews.erase(
      connection,
      {
        productId,
        skuId,
        reviewId,
      },
    );
  });
}
