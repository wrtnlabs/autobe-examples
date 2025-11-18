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

/**
 * Verify admin can list product-category links filtered by category codes and
 * primary flag.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a seller account.
 * 2. As the seller, create a single product.
 * 3. Register and authenticate an admin account.
 * 4. As the admin, create three distinct categories with unique slugs.
 * 5. Link the product to all three categories using POST
 *    /shoppingMall/admin/products/{productId}/categories, marking exactly one
 *    association as primary and the others as non-primary.
 * 6. Call PATCH /shoppingMall/admin/products/{productId}/categories with different
 *    IShoppingMallProductCategory.IRequest filters to validate categoryCodes
 *    and isPrimary behavior.
 *
 * Validations:
 *
 * - CategoryCodes filter restricts results to associations whose category slug is
 *   in the provided list.
 * - IsPrimary=true returns only primary links for those category codes.
 * - IsPrimary=false returns only non-primary links for those category codes.
 * - When isPrimary is omitted but categoryCodes are supplied, both primary and
 *   non-primary links for those categories are returned.
 * - Pagination metadata is consistent with the number of matching records.
 */
export async function test_api_admin_product_category_list_filter_by_codes_and_primary(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinHref: string = typia.random<string & tags.Format<"uri">>();
  const sellerJoinReferrer: string = typia.random<
    string & tags.Format<"uri">
  >();

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphabets(12),
        ip: null,
        href: sellerJoinHref,
        referrer: sellerJoinReferrer,
      } satisfies IShoppingMallSellerAuthJoin.IRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller creates a product
  const productCode: string = RandomGenerator.alphaNumeric(10);
  const productCreateBody = {
    code: productCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(createdProduct);

  // 3. Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinHref: string = typia.random<string & tags.Format<"uri">>();
  const adminJoinReferrer: string = typia.random<string & tags.Format<"uri">>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        ip: null,
        href: adminJoinHref,
        referrer: adminJoinReferrer,
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Admin creates three categories
  const baseSlug: string = RandomGenerator.alphaNumeric(8);
  const categorySlugs: [string, string, string] = [
    `${baseSlug}-a`,
    `${baseSlug}-b`,
    `${baseSlug}-c`,
  ];

  const categories: IShoppingMallCategory[] = [];
  for (let i = 0; i < categorySlugs.length; i++) {
    const createCategoryBody = {
      parent_id: null,
      slug: categorySlugs[i],
      name_en: `Category ${i + 1}`,
      description_en: RandomGenerator.paragraph({ sentences: 2 }),
      status: "active",
      sort_order: (i + 1) as number & tags.Type<"int32">,
      is_leaf: true,
    } satisfies IShoppingMallCategory.ICreate;

    const category: IShoppingMallCategory =
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: createCategoryBody,
      });
    typia.assert<IShoppingMallCategory>(category);
    categories.push(category);
  }

  TestValidator.equals(
    "three categories should be created",
    categories.length,
    3,
  );

  // 5. Admin links product to all three categories,
  //    one as primary and the others as non-primary.
  const productId = createdProduct.id;

  const productCategoryLinks: IShoppingMallProductCategory[] = [];
  for (let i = 0; i < categories.length; i++) {
    const isPrimary: boolean = i === 0;
    const createLinkBody = {
      shopping_mall_category_id: categories[i].id,
      is_primary: isPrimary,
    } satisfies IShoppingMallProductCategory.ICreate;

    const link: IShoppingMallProductCategory =
      await api.functional.shoppingMall.admin.products.categories.create(
        connection,
        {
          productId,
          body: createLinkBody,
        },
      );
    typia.assert<IShoppingMallProductCategory>(link);
    productCategoryLinks.push(link);
  }

  TestValidator.equals(
    "three product-category links should be created",
    productCategoryLinks.length,
    3,
  );

  const primaryLink: IShoppingMallProductCategory | undefined =
    productCategoryLinks.find((link) => link.is_primary === true);
  const nonPrimaryLinks: IShoppingMallProductCategory[] =
    productCategoryLinks.filter((link) => link.is_primary === false);

  TestValidator.predicate(
    "exactly one primary link should exist",
    primaryLink !== undefined && nonPrimaryLinks.length === 2,
  );

  // Helper: map link -> slug via matching category
  const linkSlug = (link: IShoppingMallProductCategory): string | undefined => {
    const matchedCategory = categories.find(
      (category) => category.id === link.shopping_mall_category_id,
    );
    return matchedCategory?.slug;
  };

  // Sanity: ensure mapping consistency
  TestValidator.predicate(
    "every product-category link should have a resolvable category slug",
    productCategoryLinks.every((link) => linkSlug(link) !== undefined),
  );

  // 6. PATCH with isPrimary=true and subset of categoryCodes (first two slugs)
  const filterCategoryCodesPrimary: string[] = [
    categories[0].slug,
    categories[1].slug,
  ];

  const requestPrimary = {
    page: 1,
    limit: 10,
    orderBy: undefined,
    orderDirection: undefined,
    categoryCodes: filterCategoryCodesPrimary,
    isPrimary: true,
  } satisfies IShoppingMallProductCategory.IRequest;

  const pagePrimary: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId,
        body: requestPrimary,
      },
    );
  typia.assert<IPageIShoppingMallProductCategory.ISummary>(pagePrimary);

  // Validate pagination metadata
  TestValidator.equals(
    "primary filter pagination current page should be 1",
    pagePrimary.pagination.current,
    1,
  );

  // For isPrimary=true and first two slugs, expect exactly 1 link
  TestValidator.equals(
    "primary filter should return exactly one record",
    pagePrimary.pagination.records,
    pagePrimary.data.length,
  );

  TestValidator.equals(
    "primary filter records should be 1",
    pagePrimary.pagination.records,
    1,
  );

  TestValidator.equals(
    "primary filter pages should be 1",
    pagePrimary.pagination.pages,
    1,
  );

  // Validate data content
  TestValidator.equals(
    "primary filter data length should be 1",
    pagePrimary.data.length,
    1,
  );

  const primarySummary: IShoppingMallProductCategory.ISummary =
    pagePrimary.data[0];
  typia.assert<IShoppingMallProductCategory.ISummary>(primarySummary);

  TestValidator.predicate(
    "returned primary summary slug should be within requested categoryCodes",
    filterCategoryCodesPrimary.includes(primarySummary.slug),
  );

  const expectedPrimarySlug: string | undefined = linkSlug(primaryLink!);

  TestValidator.equals(
    "primary filter summary slug should match the primary link slug",
    primarySummary.slug,
    expectedPrimarySlug,
  );

  // 7. PATCH with isPrimary=false and same categoryCodes
  const requestNonPrimary = {
    page: 1,
    limit: 10,
    orderBy: undefined,
    orderDirection: undefined,
    categoryCodes: filterCategoryCodesPrimary,
    isPrimary: false,
  } satisfies IShoppingMallProductCategory.IRequest;

  const pageNonPrimary: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId,
        body: requestNonPrimary,
      },
    );
  typia.assert<IPageIShoppingMallProductCategory.ISummary>(pageNonPrimary);

  const expectedNonPrimarySlugs: string[] = nonPrimaryLinks
    .map((link) => linkSlug(link)!)
    .filter((slug) => filterCategoryCodesPrimary.includes(slug));

  TestValidator.equals(
    "non-primary filter records should match number of expected non-primary links in those categories",
    pageNonPrimary.pagination.records,
    expectedNonPrimarySlugs.length,
  );

  TestValidator.equals(
    "non-primary filter data length should match expected count",
    pageNonPrimary.data.length,
    expectedNonPrimarySlugs.length,
  );

  const returnedNonPrimarySlugs: string[] = pageNonPrimary.data.map(
    (summary) => summary.slug,
  );

  TestValidator.predicate(
    "non-primary filter should only return links with categoryCodes subset of requested codes",
    returnedNonPrimarySlugs.every((slug) =>
      filterCategoryCodesPrimary.includes(slug),
    ),
  );

  TestValidator.predicate(
    "non-primary filter should match expected non-primary slugs",
    expectedNonPrimarySlugs.length === returnedNonPrimarySlugs.length &&
      expectedNonPrimarySlugs.every((slug) =>
        returnedNonPrimarySlugs.includes(slug),
      ),
  );

  // 8. PATCH with all category codes and isPrimary omitted
  const filterAllCategoryCodes: string[] = categories.map(
    (category) => category.slug,
  );

  const requestAllCodesNoPrimary = {
    page: 1,
    limit: 10,
    orderBy: undefined,
    orderDirection: undefined,
    categoryCodes: filterAllCategoryCodes,
  } satisfies IShoppingMallProductCategory.IRequest;

  const pageAllCodes: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId,
        body: requestAllCodesNoPrimary,
      },
    );
  typia.assert<IPageIShoppingMallProductCategory.ISummary>(pageAllCodes);

  TestValidator.equals(
    "all-codes filter pagination records should equal total links",
    pageAllCodes.pagination.records,
    productCategoryLinks.length,
  );

  TestValidator.equals(
    "all-codes filter data length should equal total links",
    pageAllCodes.data.length,
    productCategoryLinks.length,
  );

  TestValidator.predicate(
    "all-codes filter should only contain slugs within all categoryCodes",
    pageAllCodes.data.every((summary) =>
      filterAllCategoryCodes.includes(summary.slug),
    ),
  );

  // Sanity: ensure that categories not included in categoryCodes do not appear
  const extraSlug: string = `${baseSlug}-extra`;

  const requestExcludeExtra = {
    page: 1,
    limit: 10,
    orderBy: undefined,
    orderDirection: undefined,
    categoryCodes: [extraSlug],
    isPrimary: null,
  } satisfies IShoppingMallProductCategory.IRequest;

  const pageExcludeExtra: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId,
        body: requestExcludeExtra,
      },
    );
  typia.assert<IPageIShoppingMallProductCategory.ISummary>(pageExcludeExtra);

  TestValidator.equals(
    "filter with categoryCodes that do not match any linked category should return zero records",
    pageExcludeExtra.pagination.records,
    0,
  );

  TestValidator.equals(
    "filter with categoryCodes that do not match any linked category should return empty data",
    pageExcludeExtra.data.length,
    0,
  );
}
