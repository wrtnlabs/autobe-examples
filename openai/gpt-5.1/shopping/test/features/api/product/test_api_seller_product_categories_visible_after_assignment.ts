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

export async function test_api_seller_product_categories_visible_after_assignment(
  connection: api.IConnection,
) {
  /**
   * 1. Create and authenticate an admin (join), used for taxonomy and
   *    product-category wiring.
   */
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // (Optional) login again as admin to validate login path – not strictly required for behavior, but keeps flow explicit.
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  /**
   * 2. Under admin, create two active categories that can be associated to
   *    products.
   */
  const baseSlug = RandomGenerator.alphaNumeric(8);

  const categoryCreateBody1 = {
    parent_id: null,
    slug: `${baseSlug}-a`,
    name_en: `Category ${baseSlug} A`,
    description_en: "First test category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody1,
    });
  typia.assert<IShoppingMallCategory>(category1);

  const categoryCreateBody2 = {
    parent_id: null,
    slug: `${baseSlug}-b`,
    name_en: `Category ${baseSlug} B`,
    description_en: "Second test category (for another product)",
    status: "active",
    sort_order: 2 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody2,
    });
  typia.assert<IShoppingMallCategory>(category2);

  /** 3. Create and authenticate a seller (join + login) who will own products. */
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();

  const sellerJoinBody = {
    email: sellerEmail,
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
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/join-complete",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  /**
   * 4. As this seller, create a primary product (productA) whose categories we
   *    will list.
   */
  const productABody = {
    code: `CODE-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-A",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image-a.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  /**
   * 4b) As the same seller, create another product (productB) that will use the
   * second category, to ensure the seller listing for productA does not leak
   * categories of other products.
   */
  const productBBody = {
    code: `CODE-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-B",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image-b.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert<IShoppingMallProduct>(productB);

  /**
   * 5. Switch back to admin (login) and create product-category links:
   *
   *    - Link category1 to productA (target of listing)
   *    - Link category2 to productB (control that must not appear for productA)
   */
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminRelogin);

  const productAcatLinkBody = {
    shopping_mall_category_id: category1.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productACategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productAcatLinkBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productACategoryLink);

  const productBcatLinkBody = {
    shopping_mall_category_id: category2.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productBCategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productB.id,
        body: productBcatLinkBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productBCategoryLink);

  /**
   * 6. Re-authenticate as the same seller and call PATCH
   *    /shoppingMall/seller/products/{productId}/categories with a basic
   *    pagination request body.
   */
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerRelogin);

  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const listRequestBody = {
    page: requestPage,
    limit: requestLimit,
    orderBy: undefined,
    orderDirection: undefined,
    categoryCodes: undefined,
    isPrimary: null,
  } satisfies IShoppingMallProductCategory.IRequest;

  const pageResult: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.seller.products.categories.index(
      connection,
      {
        productId: productA.id,
        body: listRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductCategory.ISummary>(pageResult);

  /**
   * 7. Validate pagination metadata: current/limit reflect requested values and
   *    counts are non-negative.
   */
  const pagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "pagination current page should equal requested page",
    pagination.current,
    requestPage,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    requestLimit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  /**
   * 8. Validate that every returned summary object has required fields populated
   *    and that at least one entry corresponds to category1 (the one linked to
   *    productA).
   */
  const summaries: IShoppingMallProductCategory.ISummary[] = pageResult.data;

  // Basic shape and field-level checks via typia.assert on each summary.
  for (const summary of summaries) {
    typia.assert<IShoppingMallProductCategory.ISummary>(summary);

    TestValidator.predicate(
      "summary id must match UUID format-like string (non-empty)",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary slug must be non-empty string",
      typeof summary.slug === "string" && summary.slug.length > 0,
    );
    TestValidator.predicate(
      "summary name_en must be non-empty string",
      typeof summary.name_en === "string" && summary.name_en.length > 0,
    );
    TestValidator.predicate(
      "summary status must be non-empty string",
      typeof summary.status === "string" && summary.status.length > 0,
    );
    TestValidator.predicate(
      "summary is_leaf must be boolean",
      typeof summary.is_leaf === "boolean",
    );
    TestValidator.predicate(
      "summary sort_order should be an integer (int32-like)",
      Number.isInteger(summary.sort_order),
    );
  }

  const hasCategory1 = summaries.some((s) => s.id === category1.id);
  TestValidator.predicate(
    "listing must include the category assigned to productA",
    hasCategory1,
  );

  /**
   * 9. Confirm that categories associated only with other products (category2 via
   *    productB) do not appear in the listing for productA.
   */
  const hasCategory2 = summaries.some((s) => s.id === category2.id);
  TestValidator.predicate(
    "listing must NOT include categories from other products",
    hasCategory2 === false,
  );
}
