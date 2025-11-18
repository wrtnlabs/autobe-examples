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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_product_category_list_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register an admin and let SDK set Authorization header
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. Login as admin again to ensure login works and refresh Authorization
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 3. Create two distinct categories as admin
  const baseSlug = RandomGenerator.alphaNumeric(8);

  const category1Body = {
    parent_id: null,
    slug: `${baseSlug}-a`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: category1Body,
    });
  typia.assert(category1);

  const category2Body = {
    parent_id: null,
    slug: `${baseSlug}-b`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 2 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: category2Body,
    });
  typia.assert(category2);

  // 4. Register and login a seller, then create a product
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: sellerHref,
    referrer: sellerReferrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: sellerHref,
    referrer: sellerReferrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Switch back to admin (login again) for admin-only endpoints
  const adminReLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLoginOutput);

  // 6. Link product to categories via admin endpoint
  const linkPrimaryBody = {
    shopping_mall_category_id: category1.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const primaryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkPrimaryBody,
      },
    );
  typia.assert(primaryLink);

  const linkSecondaryBody = {
    shopping_mall_category_id: category2.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategory.ICreate;

  const secondaryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkSecondaryBody,
      },
    );
  typia.assert(secondaryLink);

  // 7. Call PATCH to list categories for the product, ordered by sort_order asc
  const requestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "sort_order",
    orderDirection: "asc" as const,
  } satisfies IShoppingMallProductCategory.IRequest;

  const page1: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId: product.id,
        body: requestPage1,
      },
    );
  typia.assert<IPageIShoppingMallProductCategory.ISummary>(page1);

  // 8. Validate pagination metadata and that linked categories are present
  const pagination: IPage.IPagination = page1.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "current page should be 1",
    pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "limit should match requested value",
    pagination.limit,
    requestPage1.limit,
  );

  TestValidator.predicate(
    "records should be >= 2 for two links",
    pagination.records >= 2,
  );

  TestValidator.predicate("pages should be >= 1", pagination.pages >= 1);

  // Ensure we have at least the two created category summaries
  TestValidator.predicate("data length should be >= 2", page1.data.length >= 2);

  const summary1 = page1.data.find((c) => c.id === category1.id);
  const summary2 = page1.data.find((c) => c.id === category2.id);

  TestValidator.predicate(
    "summary for category1 should exist",
    summary1 !== undefined,
  );
  TestValidator.predicate(
    "summary for category2 should exist",
    summary2 !== undefined,
  );

  if (summary1 !== undefined) {
    TestValidator.equals(
      "category1.slug should match",
      summary1.slug,
      category1.slug,
    );
    TestValidator.equals(
      "category1.name_en should match",
      summary1.name_en,
      category1.name_en,
    );
    TestValidator.equals(
      "category1.status should match",
      summary1.status,
      category1.status,
    );
    TestValidator.equals(
      "category1.is_leaf should match",
      summary1.is_leaf,
      category1.is_leaf,
    );
    TestValidator.equals(
      "category1.sort_order should match",
      summary1.sort_order,
      category1.sort_order,
    );
  }

  if (summary2 !== undefined) {
    TestValidator.equals(
      "category2.slug should match",
      summary2.slug,
      category2.slug,
    );
    TestValidator.equals(
      "category2.name_en should match",
      summary2.name_en,
      category2.name_en,
    );
    TestValidator.equals(
      "category2.status should match",
      summary2.status,
      category2.status,
    );
    TestValidator.equals(
      "category2.is_leaf should match",
      summary2.is_leaf,
      category2.is_leaf,
    );
    TestValidator.equals(
      "category2.sort_order should match",
      summary2.sort_order,
      category2.sort_order,
    );
  }

  // Assert ordering by sort_order asc: the lower sort_order category should come first
  if (page1.data.length >= 2) {
    const first = page1.data[0];
    const second = page1.data[1];

    TestValidator.predicate(
      "first.sort_order should be <= second.sort_order",
      first.sort_order <= second.sort_order,
    );
  }

  // 9. Validate isPrimary filter behavior: isPrimary true
  const requestPrimaryOnly = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "sort_order",
    orderDirection: "asc" as const,
    isPrimary: true,
  } satisfies IShoppingMallProductCategory.IRequest;

  const pagePrimary: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId: product.id,
        body: requestPrimaryOnly,
      },
    );
  typia.assert(pagePrimary);

  TestValidator.predicate(
    "primary filter should return at least one record",
    pagePrimary.data.length >= 1,
  );

  // 10. Validate isPrimary filter behavior: isPrimary false
  const requestSecondaryOnly = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "sort_order",
    orderDirection: "asc" as const,
    isPrimary: false,
  } satisfies IShoppingMallProductCategory.IRequest;

  const pageSecondary: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId: product.id,
        body: requestSecondaryOnly,
      },
    );
  typia.assert(pageSecondary);

  TestValidator.predicate(
    "secondary filter should return at least one record",
    pageSecondary.data.length >= 1,
  );
}
