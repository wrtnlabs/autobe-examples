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

export async function test_api_seller_product_categories_filter_by_category_codes_and_primary_flag(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create three active categories with distinct slugs
  const createCategory = async (
    slugSuffix: string,
  ): Promise<IShoppingMallCategory> => {
    const body = {
      parent_id: null,
      slug: `test-category-${slugSuffix}`,
      name_en: `Test Category ${slugSuffix}`,
      description_en: RandomGenerator.paragraph({ sentences: 3 }),
      status: "active",
      sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      is_leaf: true,
    } satisfies IShoppingMallCategory.ICreate;

    const category: IShoppingMallCategory =
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body,
      });
    typia.assert(category);
    return category;
  };

  const categoryA = await createCategory("a");
  const categoryB = await createCategory("b");
  const categoryC = await createCategory("c");

  // We'll treat each category.slug as an external "category code" for
  // filtering purposes in this test, assuming the server maps categoryCodes
  // filter entries to matching slugs.

  // 3. Seller joins and authenticates
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. As seller, create a product
  const productCreateBody = {
    code: `TEST-PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Test Brand",
    model_name: "Model X",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/product-test.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Switch back to admin (ensure admin login works and sets header)
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 6. As admin, create three product-category links, one primary and others non-primary
  const linkCategory = async (
    categoryId: string & tags.Format<"uuid">,
    isPrimary: boolean,
  ): Promise<IShoppingMallProductCategory> => {
    const body = {
      shopping_mall_category_id: categoryId,
      is_primary: isPrimary,
    } satisfies IShoppingMallProductCategory.ICreate;

    const link: IShoppingMallProductCategory =
      await api.functional.shoppingMall.admin.products.categories.create(
        connection,
        {
          productId: product.id,
          body,
        },
      );
    typia.assert(link);
    return link;
  };

  const linkPrimary = await linkCategory(categoryA.id, true);
  const linkNonPrimary1 = await linkCategory(categoryB.id, false);
  const linkNonPrimary2 = await linkCategory(categoryC.id, false);

  // 7. Switch to seller again via login to ensure seller token is set
  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // Helper to call seller-facing product categories index
  const queryCategories = async (
    request: IShoppingMallProductCategory.IRequest,
  ): Promise<IPageIShoppingMallProductCategory.ISummary> => {
    const page: IPageIShoppingMallProductCategory.ISummary =
      await api.functional.shoppingMall.seller.products.categories.index(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          body: request,
        },
      );
    typia.assert(page);
    return page;
  };

  const expectSingleCategoryByCode = async (slug: string) => {
    const request = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      categoryCodes: [slug],
      isPrimary: null,
    } satisfies IShoppingMallProductCategory.IRequest;

    const page = await queryCategories(request);

    TestValidator.equals(
      `single-code filter '${slug}' should return exactly 1 record`,
      page.pagination.records,
      1 as number,
    );

    TestValidator.equals(
      `single-code filter '${slug}' should return 1 item in data`,
      page.data.length,
      1 as number,
    );
  };

  await expectSingleCategoryByCode(categoryA.slug);
  await expectSingleCategoryByCode(categoryB.slug);
  await expectSingleCategoryByCode(categoryC.slug);

  // 8. Filter by isPrimary=true only
  const primaryRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    isPrimary: true,
  } satisfies IShoppingMallProductCategory.IRequest;

  const primaryPage = await queryCategories(primaryRequest);

  TestValidator.equals(
    "isPrimary=true should return exactly 1 primary association",
    primaryPage.pagination.records,
    1 as number,
  );

  TestValidator.equals(
    "isPrimary=true should return 1 data row",
    primaryPage.data.length,
    1 as number,
  );

  // 9. Filter by isPrimary=false (non-primary only)
  const nonPrimaryRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    isPrimary: false,
  } satisfies IShoppingMallProductCategory.IRequest;

  const nonPrimaryPage = await queryCategories(nonPrimaryRequest);

  TestValidator.equals(
    "isPrimary=false should return exactly 2 non-primary associations",
    nonPrimaryPage.pagination.records,
    2 as number,
  );

  TestValidator.equals(
    "isPrimary=false should return 2 data rows",
    nonPrimaryPage.data.length,
    2 as number,
  );

  // 10. Filter by multiple categoryCodes (two slugs) without isPrimary
  const multiCodeRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    categoryCodes: [categoryA.slug, categoryB.slug],
    isPrimary: null,
  } satisfies IShoppingMallProductCategory.IRequest;

  const multiCodePage = await queryCategories(multiCodeRequest);

  TestValidator.equals(
    "multi-code filter should return exactly 2 matching associations",
    multiCodePage.pagination.records,
    2 as number,
  );

  TestValidator.equals(
    "multi-code filter should return 2 data rows",
    multiCodePage.data.length,
    2 as number,
  );

  // 11. Validate that unfiltered call (no categoryCodes, isPrimary omitted)
  //     returns all three links and pagination metadata matches.
  const unfilteredRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallProductCategory.IRequest;

  const unfilteredPage = await queryCategories(unfilteredRequest);

  TestValidator.equals(
    "unfiltered listing should see 3 associations for the product",
    unfilteredPage.pagination.records,
    3 as number,
  );

  TestValidator.equals(
    "unfiltered listing should return 3 data rows",
    unfilteredPage.data.length,
    3 as number,
  );
}
