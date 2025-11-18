import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductLocalization";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductLocalization";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_product_localizations_index_locale_filtering(
  connection: api.IConnection,
) {
  // 1. Register seller and log in as seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 2. Create a product as seller
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE-Test-Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Create three localizations (en-US, ko-KR, ja-JP) for this product
  const locales = ["en-US", "ko-KR", "ja-JP"] as const;

  const createLocalization = async (
    locale: (typeof locales)[number],
  ): Promise<IShoppingMallProductLocalization> => {
    const body = {
      locale,
      title: `Title ${locale}`,
      summary: `Summary ${locale}`,
      description: `Description ${locale}`,
    } satisfies IShoppingMallProductLocalization.ICreate;

    const localization: IShoppingMallProductLocalization =
      await api.functional.shoppingMall.seller.products.localizations.create(
        connection,
        {
          productId: product.id,
          body,
        },
      );
    typia.assert(localization);
    TestValidator.equals(
      `created localization product_id matches for ${locale}`,
      localization.product_id,
      product.id,
    );
    TestValidator.equals(
      `created localization locale matches for ${locale}`,
      localization.locale,
      locale,
    );
    return localization;
  };

  const enLocalization = await createLocalization("en-US");
  const koLocalization = await createLocalization("ko-KR");
  const jaLocalization = await createLocalization("ja-JP");
  void enLocalization;
  void koLocalization;
  void jaLocalization;

  // 4. Register admin and log in as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 5. (Optional) Create a category and link product to category as admin
  const categoryCreateBody = {
    parent_id: null,
    slug: `autobe-test-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "AutoBE Test Category",
    description_en: "Category for AutoBE localization index tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 6. Call admin localization index with locales ["en-US", "ko-KR"]
  const firstRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: ["en-US", "ko-KR"],
    search: undefined,
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const firstPage: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: product.id,
        body: firstRequestBody,
      },
    );
  typia.assert(firstPage);

  // Basic pagination sanity checks
  TestValidator.equals(
    "pagination current page is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    firstPage.pagination.pages >= 0,
  );

  const allowedLocales = ["en-US", "ko-KR"] as const;

  await ArrayUtil.asyncForEach(firstPage.data, async (summary, index) => {
    void index;
    // Scope check: product_id must match created product
    TestValidator.equals(
      "localization product_id matches created product",
      summary.product_id,
      product.id,
    );

    // Locale must be one of the requested locales
    TestValidator.predicate(
      "localization locale is one of requested locales",
      allowedLocales.includes(
        summary.locale as (typeof allowedLocales)[number],
      ),
    );

    // Explicitly ensure ja-JP is not returned when filtering en-US/ko-KR
    TestValidator.notEquals(
      "localization locale is not ja-JP when filtering en-US/ko-KR",
      summary.locale,
      "ja-JP",
    );
  });

  // 7. Call admin localization index again with locales ["ja-JP"]
  const secondRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: ["ja-JP"],
    search: undefined,
    orderBy: "created_at" as const,
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const secondPage: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: product.id,
        body: secondRequestBody,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second pagination current page is 1",
    secondPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "second pagination limit equals requested limit",
    secondPage.pagination.limit,
    10,
  );

  await ArrayUtil.asyncForEach(secondPage.data, async (summary, index) => {
    void index;
    TestValidator.equals(
      "ja-JP localization product_id matches created product",
      summary.product_id,
      product.id,
    );
    TestValidator.equals(
      "ja-JP localization locale is exactly ja-JP",
      summary.locale,
      "ja-JP",
    );
  });
}
