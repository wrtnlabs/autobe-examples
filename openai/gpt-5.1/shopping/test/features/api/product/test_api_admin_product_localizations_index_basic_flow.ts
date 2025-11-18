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

/**
 * Basic admin listing flow for product localizations.
 *
 * Business goal
 *
 * - Ensure that an admin can retrieve a paginated list of localizations for a
 *   specific product that already has multiple locale records.
 * - Confirm that only localizations for the target product are returned and that
 *   pagination metadata is consistent with the request.
 *
 * Scenario
 *
 * 1. Create a seller actor (email/password based join) and implicitly log in.
 * 2. As seller, create a product using IShoppingMallProduct.ICreate.
 * 3. As seller, create two localizations for that product with different locales
 *    (e.g., "en-US" and "ko-KR") via seller localizations.create.
 * 4. Create an admin actor by calling /auth/admin/join and implicitly log in.
 * 5. Optionally, as admin, create a category and link the product to that category
 *    using the admin category and product-category endpoints to reflect a
 *    realistic catalog configuration.
 * 6. As admin, call PATCH /shoppingMall/admin/products/{productId}/localizations
 *    with IShoppingMallProductLocalization.IRequest: page=1, limit=10, without
 *    locale filter.
 * 7. Validate that the response is IPageIShoppingMallProductLocalization.ISummary
 *    via typia.assert.
 * 8. Confirm pagination.current === 1 and pagination.limit equals the requested
 *    limit.
 * 9. Assert that the returned data array includes summary entries for both created
 *    locales, matching product_id, locale, title, and summary fields.
 * 10. Assert that every record in the response has product_id equal to the created
 *     product id (no leakage of other products).
 */
export async function test_api_admin_product_localizations_index_basic_flow(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a seller
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

  // 2. As seller, create a product
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

  // 3. As seller, create two localizations for different locales
  const enLocale = "en-US";
  const koLocale = "ko-KR";

  const enLocalizationBody = {
    locale: enLocale,
    title: "EN Title " + RandomGenerator.paragraph({ sentences: 2 }),
    summary: "EN Summary " + RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const koLocalizationBody = {
    locale: koLocale,
    title: "KO Title " + RandomGenerator.paragraph({ sentences: 2 }),
    summary: "KO Summary " + RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const enLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: enLocalizationBody,
      },
    );
  typia.assert(enLocalization);

  const koLocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: product.id,
        body: koLocalizationBody,
      },
    );
  typia.assert(koLocalization);

  // 4. Create and authenticate an admin (join implicitly logs in)
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

  // 5. Optionally create a category and link the product to it as admin
  const categoryCreateBody = {
    parent_id: null,
    slug: "autobe-test-" + RandomGenerator.alphaNumeric(8),
    name_en: "AutoBE Test Category",
    description_en: "Category for admin localization index e2e tests",
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

  // 6. As admin, index localizations for the product with pagination
  const requestedLimit: number & tags.Type<"int32"> & tags.Minimum<1> =
    10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: requestedLimit,
    locales: undefined,
    search: undefined,
    orderBy: "created_at" as "created_at",
    orderDirection: "desc" as "desc",
  } satisfies IShoppingMallProductLocalization.IRequest;

  const page: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: product.id,
        body: requestBody,
      },
    );
  typia.assert(page);

  // 7. Validate pagination metadata
  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    requestedLimit,
  );

  // 8. Validate that all data entries belong to the same product
  TestValidator.predicate(
    "all localization summaries belong to the created product",
    page.data.every((summary) => summary.product_id === product.id),
  );

  // 9. Check that at least the two created locales appear in the summaries
  const localesInPage = page.data.map((summary) => summary.locale);

  TestValidator.predicate(
    "page contains EN localization for the product",
    localesInPage.includes(enLocale),
  );

  TestValidator.predicate(
    "page contains KO localization for the product",
    localesInPage.includes(koLocale),
  );

  // 10. Validate that summaries for the created locales have matching title and summary
  const findSummaryByLocale = (
    locale: string,
  ): IShoppingMallProductLocalization.ISummary | undefined =>
    page.data.find((summary) => summary.locale === locale);

  const enSummary = findSummaryByLocale(enLocale);
  const koSummary = findSummaryByLocale(koLocale);

  if (enSummary) {
    TestValidator.equals(
      "EN localization summary title should match created title",
      enSummary.title,
      enLocalization.title,
    );
    TestValidator.equals(
      "EN localization summary summary should match created summary",
      enSummary.summary,
      enLocalization.summary,
    );
  }

  if (koSummary) {
    TestValidator.equals(
      "KO localization summary title should match created title",
      koSummary.title,
      koLocalization.title,
    );
    TestValidator.equals(
      "KO localization summary summary should match created summary",
      koSummary.summary,
      koLocalization.summary,
    );
  }
}
