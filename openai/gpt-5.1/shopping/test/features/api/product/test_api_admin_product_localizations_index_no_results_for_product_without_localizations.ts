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
 * Validate admin localization index returns an empty page for a product without
 * localizations.
 *
 * Business goal:
 *
 * - Ensure that when a product exists but has no entries in
 *   shopping_mall_product_localizations, the admin localization index endpoint
 *   returns an empty list with consistent pagination metadata instead of errors
 *   or phantom records.
 *
 * High-level flow:
 *
 * 1. Bootstrap an admin actor using POST /auth/admin/join.
 * 2. Bootstrap a seller actor using POST /auth/seller/join.
 * 3. As seller, create a new product via POST /shoppingMall/seller/products.
 * 4. Optionally, as admin, create a category and a product-category link to keep
 *    catalog configuration realistic.
 * 5. As admin, call PATCH /shoppingMall/admin/products/{productId}/localizations
 *    with page=1 and limit=10, leaving locale/search filters unspecified.
 * 6. Assert that the response is structurally valid and represents an empty page:
 *
 *    - Pagination.current === 1
 *    - Pagination.limit === 10
 *    - Pagination.records === 0
 *    - Pagination.pages === 0
 *    - Data.length === 0
 */
export async function test_api_admin_product_localizations_index_no_results_for_product_without_localizations(
  connection: api.IConnection,
) {
  // 1. Admin join (also yields initial admin auth token)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Seller join (seller actor & token)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 3. (Optional) re-login seller to respect dependency that mentions login
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuth);

  // 4. As seller, create a new product with required fields only
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Switch back to admin: optional explicit login to honor dependency
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth);

  // 6. Optionally create a category and link it to the product to keep catalog realistic
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: null,
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
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

  // 7. As admin, index localizations for the product with page=1, limit=10 and no filters
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: undefined,
    search: undefined,
    orderBy: undefined,
    orderDirection: undefined,
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

  // 8. Assertions: empty result set and correct pagination metadata
  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination.current should be 1 for first page",
    pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "pagination.limit should equal requested limit=10",
    pagination.limit,
    10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "pagination.records should be 0 when no localizations exist for product",
    pagination.records,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "pagination.pages should be 0 when there are no records",
    pagination.pages,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "localization data list should be empty for product without localizations",
    page.data.length,
    0,
  );
}
