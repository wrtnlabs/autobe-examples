import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate customer product-category listing filters by categoryCodes and
 * isPrimary.
 *
 * Business workflow:
 *
 * - Admin manages global categories and product-category links.
 * - Seller owns products.
 * - Customer queries categories for a product via customer-facing endpoint.
 *
 * Steps implemented in this test:
 *
 * 1. Create an admin via /auth/admin/join (no separate login needed because join
 *    sets Authorization header).
 * 2. As admin, create three active leaf categories with distinct slugs using POST
 *    /shoppingMall/admin/categories.
 * 3. Create a seller via /auth/seller/join (again, join gives seller token
 *    automatically).
 * 4. As seller, create a product via POST /shoppingMall/seller/products.
 * 5. Switch back to admin by calling /auth/admin/login, so that subsequent admin
 *    endpoints are authorized as admin.
 * 6. For that product, create three product–category links via POST
 *    /shoppingMall/admin/products/{productId}/categories:
 *
 *    - Link A: category 1, is_primary = true
 *    - Link B: category 2, is_primary = false
 *    - Link C: category 3, is_primary = false
 * 7. Create a customer via /auth/customer/join (customer token is now active).
 * 8. As customer, call PATCH
 *    /shoppingMall/customer/products/{productId}/categories with various
 *    IShoppingMallProductCategory.IRequest bodies and assert filtering:
 *
 *    - (a) categoryCodes contains only category1.slug, isPrimary: null → expect
 *         exactly the primary link only.
 *    - (b) categoryCodes contains only category2.slug, isPrimary: null → expect
 *         exactly the non-primary link to category2.
 *    - (c) isPrimary: true, no categoryCodes → expect only primary link (category1).
 *    - (d) isPrimary: false, no categoryCodes → expect only the two non-primary
 *         links (categories 2 and 3).
 *    - (e) categoryCodes: [category1.slug, category3.slug], isPrimary: null → expect
 *         links for categories 1 and 3 only.
 *
 * For each response, validate:
 *
 * - Typia.assert on the page object (IPageIShoppingMallProductCategory.ISummary).
 * - Pagination.records equals data.length (all links fit into one page with
 *   default limit when we ask for small data set).
 * - Pagination.current and pagination.pages behave consistently when we
 *   explicitly set page and limit.
 * - Data set contains only expected category slugs, and the is_primary semantics
 *   are honored.
 */
export async function test_api_customer_product_categories_filter_by_category_codes_and_primary_flag(
  connection: api.IConnection,
) {
  // 1. Admin join (gives us admin token in connection.headers automatically).
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates three active leaf categories with distinct slugs.
  const makeCategoryBody = (slug: string): IShoppingMallCategory.ICreate => ({
    parent_id: null,
    slug,
    name_en: `Category ${slug}`,
    description_en: `Description for ${slug}`,
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  });

  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: makeCategoryBody(`cat-${RandomGenerator.alphaNumeric(8)}`),
    });
  typia.assert(category1);

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: makeCategoryBody(`cat-${RandomGenerator.alphaNumeric(8)}`),
    });
  typia.assert(category2);

  const category3: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: makeCategoryBody(`cat-${RandomGenerator.alphaNumeric(8)}`),
    });
  typia.assert(category3);

  // 3. Seller join (connection.headers will now contain seller token).
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Seller creates a product.
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://images.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Switch back to admin by logging in; keep admin email/password from join.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-referrer",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Admin creates three product-category links for this product.
  const linkPrimary: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category1.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(linkPrimary);

  const linkNonPrimary2: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category2.id,
          is_primary: false,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(linkNonPrimary2);

  const linkNonPrimary3: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category3.id,
          is_primary: false,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(linkNonPrimary3);

  // 7. Customer join (connection.headers will now carry customer token).
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Helper: assert pagination consistency (records/data length for our small dataset).
  const assertPagination = (
    page: IPageIShoppingMallProductCategory.ISummary,
  ) => {
    const pagination = page.pagination;
    const data = page.data;
    const recordCount: number = pagination.records;
    TestValidator.equals(
      "pagination.records equals data length for small dataset",
      recordCount,
      data.length,
    );
    TestValidator.predicate(
      "pagination.current is non-negative",
      pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination.pages is at least 1 when there is data, otherwise 0 or 1",
      data.length === 0
        ? pagination.pages === 0 || pagination.pages === 1
        : pagination.pages >= 1,
    );
  };

  // 8(a). Filter by single category slug (category1), isPrimary: null.
  const pageByCategory1: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          orderBy: undefined,
          orderDirection: undefined,
          categoryCodes: [category1.slug],
          isPrimary: null,
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(pageByCategory1);
  assertPagination(pageByCategory1);
  TestValidator.equals(
    "filter by category1.slug returns exactly one primary link",
    pageByCategory1.data.length,
    1,
  );
  TestValidator.equals(
    "returned category slug matches category1",
    pageByCategory1.data[0]?.slug,
    category1.slug,
  );

  // 8(b). Filter by single category slug (category2), isPrimary: null.
  const pageByCategory2: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          orderBy: undefined,
          orderDirection: undefined,
          categoryCodes: [category2.slug],
          isPrimary: null,
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(pageByCategory2);
  assertPagination(pageByCategory2);
  TestValidator.equals(
    "filter by category2.slug returns exactly one non-primary link",
    pageByCategory2.data.length,
    1,
  );
  TestValidator.equals(
    "returned category slug matches category2",
    pageByCategory2.data[0]?.slug,
    category2.slug,
  );

  // 8(c). Filter by isPrimary=true only.
  const pagePrimaryOnly: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          orderBy: undefined,
          orderDirection: undefined,
          categoryCodes: undefined,
          isPrimary: true,
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(pagePrimaryOnly);
  assertPagination(pagePrimaryOnly);
  TestValidator.equals(
    "isPrimary=true returns exactly one link",
    pagePrimaryOnly.data.length,
    1,
  );
  TestValidator.equals(
    "isPrimary=true result is category1",
    pagePrimaryOnly.data[0]?.slug,
    category1.slug,
  );

  // 8(d). Filter by isPrimary=false only.
  const pageNonPrimaryOnly: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          orderBy: undefined,
          orderDirection: undefined,
          categoryCodes: undefined,
          isPrimary: false,
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(pageNonPrimaryOnly);
  assertPagination(pageNonPrimaryOnly);
  TestValidator.equals(
    "isPrimary=false returns exactly two non-primary links",
    pageNonPrimaryOnly.data.length,
    2,
  );
  const nonPrimarySlugs = pageNonPrimaryOnly.data.map((d) => d.slug).sort();
  const expectedNonPrimarySlugs = [category2.slug, category3.slug].sort();
  TestValidator.equals(
    "non-primary result slugs match categories 2 and 3",
    nonPrimarySlugs,
    expectedNonPrimarySlugs,
  );

  // 8(e). Filter by multiple categoryCodes: [category1.slug, category3.slug].
  const pageByMultipleCodes: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          orderBy: undefined,
          orderDirection: undefined,
          categoryCodes: [category1.slug, category3.slug],
          isPrimary: null,
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(pageByMultipleCodes);
  assertPagination(pageByMultipleCodes);
  TestValidator.equals(
    "multi-code filter returns exactly two links",
    pageByMultipleCodes.data.length,
    2,
  );
  const multiSlugs = pageByMultipleCodes.data.map((d) => d.slug).sort();
  const expectedMultiSlugs = [category1.slug, category3.slug].sort();
  TestValidator.equals(
    "multi-code filter returns only categories 1 and 3",
    multiSlugs,
    expectedMultiSlugs,
  );
}
