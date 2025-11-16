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
 * End-to-end test: a customer updates their own product review on a specific
 * SKU.
 *
 * Business flow:
 *
 * 1. Register a platform admin and log in, obtaining admin authorization.
 * 2. As platform admin, create catalog prerequisites: a category tree and a brand.
 * 3. Register a seller, log in as that seller, and create a seller-owned product.
 * 4. As the same seller, define an option type and an option value for that
 *    product.
 * 5. Switch back to platform admin and create a SKU variant for the product using
 *    its productCode.
 * 6. Register a customer and authenticate as that customer.
 * 7. As the customer, create an initial review for the product/SKU pair.
 * 8. As the same customer, call the update endpoint to change rating, title, body,
 *    and visibility flag.
 * 9. Validate that the response reflects updated fields while immutable
 *    associations (product and SKU) remain unchanged.
 */
export async function test_api_product_review_update_by_review_author(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Optional: explicit login to exercise login dependency and ensure token works
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.example.com/login",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Category tree creation by platform admin
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Catalog Tree",
    description: "Main category tree for testing",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 2b. Brand creation by platform admin
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: "Test brand for product review scenario",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Seller registration and product creation
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphabets(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Explicit seller login to ensure context is correct (even though join already authenticates)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.example.com/login",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const productCode: string = `P-${RandomGenerator.alphaNumeric(10)}`;

  const sellerProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Test Product ${RandomGenerator.name(1)}`,
    short_description: "Short description for test product",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-main.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(product);

  // 4. Seller defines product option type and value
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "blue",
    display_name: "Blue",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 5. Switch back to platform admin and create SKU for the product
  const adminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(10)}`;

  const skuBody = {
    code: skuCode,
    name: `Variant ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  TestValidator.equals(
    "sku should belong to same product code",
    sku.productCode,
    product.code,
  );

  // 6. Register and authenticate a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphabets(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shoppingmall.example.com/login",
    referrer: "https://shoppingmall.example.com/landing",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 7. Customer creates an initial review for the product/SKU
  const initialRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;

  const initialReviewBody = {
    rating: initialRating,
    title: "Great product",
    body: "Initial review body content.",
  } satisfies IShoppingMallProductReview.ICreate;

  const originalReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.create(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: initialReviewBody,
      },
    );
  typia.assert(originalReview);

  TestValidator.equals(
    "review.product.id should match product.id",
    originalReview.product.id,
    product.id,
  );

  if (originalReview.sku !== undefined && originalReview.sku !== null) {
    TestValidator.equals(
      "review.sku.id should match sku.id when present",
      originalReview.sku.id,
      sku.id,
    );
  }

  TestValidator.predicate(
    "original rating should be within 1-5",
    originalReview.rating >= 1 && originalReview.rating <= 5,
  );

  // 8. Customer updates the review (main endpoint under test)
  const newRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> =
    initialRating ===
    (5 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
      ? (4 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
      : (5 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>);

  const updatedTitle = "Updated review title";
  const updatedBodyText = "Updated review body with more detailed feedback.";

  const updateBody = {
    rating: newRating,
    title: updatedTitle,
    body: updatedBodyText,
    is_public: false,
  } satisfies IShoppingMallProductReview.IUpdate;

  const updatedReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.skus.reviews.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        reviewId: originalReview.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);

  // 9. Validate update behavior
  TestValidator.equals(
    "product association remains unchanged after update",
    updatedReview.product.id,
    originalReview.product.id,
  );

  if (
    originalReview.sku !== undefined &&
    originalReview.sku !== null &&
    updatedReview.sku !== undefined &&
    updatedReview.sku !== null
  ) {
    TestValidator.equals(
      "sku association remains unchanged after update",
      updatedReview.sku.id,
      originalReview.sku.id,
    );
    TestValidator.equals(
      "sku code remains unchanged after update",
      updatedReview.sku.code,
      originalReview.sku.code,
    );
  }

  TestValidator.predicate(
    "rating should be within 1-5 after update",
    updatedReview.rating >= 1 && updatedReview.rating <= 5,
  );

  TestValidator.notEquals(
    "rating should change when updated",
    originalReview.rating,
    updatedReview.rating,
  );

  TestValidator.equals(
    "title should be updated to new value",
    updatedReview.title ?? null,
    updatedTitle,
  );

  TestValidator.equals(
    "body should be updated to new value",
    updatedReview.body ?? null,
    updatedBodyText,
  );

  TestValidator.predicate(
    "updated isPublic flag should be boolean or undefined",
    typeof updatedReview.isPublic === "boolean" ||
      typeof updatedReview.isPublic === "undefined",
  );
}
