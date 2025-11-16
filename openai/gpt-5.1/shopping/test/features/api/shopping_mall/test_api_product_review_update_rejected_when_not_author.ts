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
 * Validate that a non-author customer cannot update another customer's SKU
 * review.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform admin, a seller, and two customers (A
 *    and B).
 * 2. As platform admin, create a category tree, a brand, a product, and a SKU.
 * 3. As seller, create an additional seller product, option type, and option value
 *    to satisfy catalog configuration dependencies (not directly used in review
 *    calls).
 * 4. As Customer A, create a review for the created product and SKU.
 * 5. As Customer B, attempt to update Customer A's review using the review update
 *    API.
 * 6. Verify that the update attempt fails with an error, demonstrating that only
 *    the original author can modify their review.
 */
export async function test_api_product_review_update_rejected_when_not_author(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Register and authenticate seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 3. Register Customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPassword = RandomGenerator.alphaNumeric(12);

  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuth);

  // 4. Register Customer B
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPassword = RandomGenerator.alphaNumeric(12);

  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuth);

  // 5. As platform admin, create category tree and brand
  // platformAdmin.join call already set Authorization header, so we remain as admin here.
  const categoryTreeCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 6. As platform admin, create catalog product and SKU
  const adminProductCreateBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductCreateBody,
      },
    );
  typia.assert(adminProduct);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: adminProduct.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 7. As seller, create seller product, option type, and option value
  // Switch to seller login explicitly to ensure context
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuth);

  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerLoginAuth.id,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 8. As Customer A, create a review for the admin product and SKU
  const customerALoginBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerALoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALoginAuth);

  const reviewCreateBody = {
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const createdReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: adminProduct.id,
        skuId: sku.id,
        body: reviewCreateBody,
      },
    );
  typia.assert(createdReview);

  TestValidator.equals(
    "created review rating should match input",
    createdReview.rating,
    reviewCreateBody.rating,
  );

  // 9. As Customer B, attempt to update Customer A's review
  const customerBLoginBody = {
    email: customerBEmail,
    password: customerBPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerBLoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBLoginAuth);

  const reviewUpdateBody = {
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 2 }),
    is_public: false,
  } satisfies IShoppingMallProductReview.IUpdate;

  await TestValidator.error(
    "non-author customer cannot update another customer's review",
    async () => {
      await api.functional.shoppingMall.customer.products.skus.reviews.update(
        connection,
        {
          productId: adminProduct.id,
          skuId: sku.id,
          reviewId: createdReview.id,
          body: reviewUpdateBody,
        },
      );
    },
  );
}
