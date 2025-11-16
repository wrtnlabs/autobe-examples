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

export async function test_api_customer_create_review_for_purchased_sku(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = "AdminPassword123!";

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Explicit platform admin login to simulate normal flow
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 2. Create category tree as platform admin
  const categoryTreeCode: string = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeCreateBody = {
    code: categoryTreeCode,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // 3. Create brand as platform admin
  const brandSlug: string = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: "E2E Test Brand",
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logo/test-brand.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Seller join
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = "SellerPassword123!";

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: `Store-${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Explicit seller login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 5. Seller creates a product (multi-SKU capable)
  const sellerProductCode: string & tags.MinLength<1> =
    `SELL-${RandomGenerator.alphaNumeric(10)}` as string as string &
      tags.MinLength<1>;

  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode,
    name: "Seller Catalog Product",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/seller-product.png" as string &
        tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // 6. Define option type for the seller product
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
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

  // 7. Define option value under that option type
  const optionValueCreateBody = {
    value: "L",
    display_name: "Large",
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

  // 8. Platform admin creates a product for same seller and brand
  const adminProductCode: string & tags.MinLength<1> =
    `ADMIN-${RandomGenerator.alphaNumeric(10)}` as string as string &
      tags.MinLength<1>;

  const adminProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: adminProductCode,
    name: "Admin Catalog Product",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/admin-product.png" as string &
        tags.Format<"uri">,
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

  // 9. Platform admin creates a SKU under that product
  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(8)}`;

  const skuCreateBody = {
    code: skuCode,
    name: "Admin Product SKU L",
    listPrice: 100.0,
    salePrice: 90.0,
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

  // 10. Customer join & login
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = "CustomerPassword123!";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
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
    href: "https://shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  // 11. Customer creates a review for the SKU
  const rating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;

  // Use a short constant string for title to safely satisfy MaxLength<255>
  const reviewTitle: string & tags.MinLength<1> & tags.MaxLength<255> =
    "Great product" as string & tags.MinLength<1> & tags.MaxLength<255>;

  const reviewBody: string & tags.MinLength<1> = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  }) as string & tags.MinLength<1>;

  const reviewCreateBody = {
    rating,
    title: reviewTitle,
    body: reviewBody,
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

  // 12. Business-level assertions
  TestValidator.equals(
    "review rating matches input",
    createdReview.rating,
    rating,
  );

  TestValidator.equals(
    "review product id matches admin product id",
    createdReview.product.id,
    adminProduct.id,
  );

  // Ensure SKU summary is present and matches
  TestValidator.predicate(
    "review has sku summary",
    createdReview.sku !== null && createdReview.sku !== undefined,
  );

  if (createdReview.sku !== null && createdReview.sku !== undefined) {
    TestValidator.equals(
      "review sku id matches created sku id",
      createdReview.sku.id,
      sku.id,
    );
  }

  TestValidator.predicate(
    "review isPublic is boolean",
    typeof createdReview.isPublic === "boolean",
  );

  TestValidator.predicate(
    "review status is one of published|pending|hidden",
    createdReview.status === "published" ||
      createdReview.status === "pending" ||
      createdReview.status === "hidden",
  );
}
