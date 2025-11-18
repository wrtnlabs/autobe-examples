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
 * Validate that customer product category listing reflects only existing
 * product-category links for a real product, with correct pagination.
 *
 * Business intent:
 *
 * - A customer viewing categories for a product should only see categories that
 *   are currently associated with that product via
 *   shopping_mall_product_categories.
 * - Historical or hypothetical soft-deleted links or categories are not
 *   represented by any supported public API in this SDK, so this test focuses
 *   on validating that only live associations we create are visible and that
 *   pagination metadata matches the number of such associations.
 *
 * Steps implemented:
 *
 * 1. Admin join: create an admin account using /auth/admin/join.
 * 2. Admin login: ensure we are authenticated as admin via /auth/admin/login so
 *    that subsequent admin operations (like category creation and
 *    product-category linking) are authorized.
 * 3. Admin creates two categories via POST /shoppingMall/admin/categories.
 * 4. Seller join and login: create a seller and authenticate via /auth/seller/join
 *    and /auth/seller/login, then create a product via POST
 *    /shoppingMall/seller/products.
 * 5. Admin login again to regain admin context (SDK handles Authorization header
 *    switching) and create two product-category links for the product using
 *    POST /shoppingMall/admin/products/{productId}/categories.
 * 6. Customer join and login: create a customer account via /auth/customer/join
 *    and /auth/customer/login.
 * 7. As the authenticated customer, call PATCH
 *    /shoppingMall/customer/products/{productId}/categories with a simple
 *    request body (page=1, limit large enough, and no filters).
 * 8. Assert that:
 *
 *    - The response type matches IPageIShoppingMallProductCategory.ISummary (via
 *         typia.assert).
 *    - Pagination.records equals the number of created product-category links (2 in
 *         this scenario).
 *    - The data array length equals the number of links we created.
 *    - The set of returned category IDs exactly equals the set of categories we
 *         linked, ensuring no unrelated categories are included.
 */
export async function test_api_customer_product_categories_excludes_soft_deleted_links_and_categories(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "Admin#1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login (explicit) to ensure header context
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Admin creates two categories
  const categoryBody1 = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(8)}`,
    name_en: "Category One",
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryBody2 = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(8)}`,
    name_en: "Category Two",
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 2 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody1,
    });
  typia.assert(category1);

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody2,
    });
  typia.assert(category2);

  // 4. Seller join and login
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com` as string &
      tags.Format<"email">,
    password: "Seller#1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // Seller creates a product
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.test.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Switch back to admin to create product-category links
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const linkBody1 = {
    shopping_mall_category_id: category1.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const linkBody2 = {
    shopping_mall_category_id: category2.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategory.ICreate;

  const link1: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkBody1,
      },
    );
  typia.assert(link1);

  const link2: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkBody2,
      },
    );
  typia.assert(link2);

  // 6. Customer join and login
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test.com` as string &
      tags.Format<"email">,
    password: "Customer#1234" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.test.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerAuthorized.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://customer.test.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 7. Customer calls product categories listing for the product
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: undefined,
    orderDirection: undefined,
    categoryCodes: undefined,
    isPrimary: null,
  } satisfies IShoppingMallProductCategory.IRequest;

  const page: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.customer.products.categories.index(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: listRequestBody,
      },
    );
  typia.assert(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  // 8. Assertions on pagination and data contents
  TestValidator.equals(
    "pagination.records should equal number of created links",
    pagination.records,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "data length should equal number of created links",
    page.data.length,
    2,
  );

  const returnedCategoryIds = page.data.map((summary) => summary.id);

  // Ensure both category IDs are present and no unexpected IDs appear
  TestValidator.predicate(
    "both linked categories are included in the customer listing",
    returnedCategoryIds.includes(category1.id) &&
      returnedCategoryIds.includes(category2.id),
  );

  TestValidator.equals(
    "customer listing should not include more category IDs than created",
    returnedCategoryIds.length,
    2,
  );
}
