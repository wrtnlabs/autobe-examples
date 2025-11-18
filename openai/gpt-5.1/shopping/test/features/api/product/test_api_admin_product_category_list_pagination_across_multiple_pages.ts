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
 * Validate admin product-category listing pagination across multiple pages.
 *
 * Business goal: Ensure that the admin endpoint PATCH
 * /shoppingMall/admin/products/{productId}/categories returns correctly
 * paginated product-category associations when the product is linked to more
 * categories than fit onto a single page. The test covers metadata consistency,
 * page window boundaries (no gaps/overlaps), ordering, and out-of-range page
 * behavior.
 *
 * High level steps:
 *
 * 1. Create an admin and authenticate.
 * 2. Create a seller and a product owned by that seller.
 * 3. Switch back to the admin context.
 * 4. Create 25 root categories with ascending sort_order values.
 * 5. Link every category to the product via product-category create API.
 * 6. Call page 1 (limit=10) and validate metadata and first 10 categories.
 * 7. Call page 2 (limit=10) and validate metadata and next 10 categories.
 * 8. Call page 3 (limit=10) and validate metadata and remaining 5 categories.
 * 9. Call page 4 (limit=10) and validate empty data with consistent metadata.
 * 10. Ensure global contiguity and uniqueness of category IDs across pages and that
 *     repeated calls with identical parameters return stable ordering.
 */
export async function test_api_admin_product_category_list_pagination_across_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Admin join (registration)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Seller join & product creation
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Create a product as the seller
  const productCreateBody = {
    code: `CODE-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const productId: string & tags.Format<"uuid"> = product.id;

  // 3. Switch explicitly back to admin via login (to ensure admin token is active)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 4. Create 25 categories with deterministic sort_order 1..25
  const totalCategories = 25;
  const createdCategories: IShoppingMallCategory[] = [];

  for (let index = 0; index < totalCategories; index++) {
    const sortOrder = (index + 1) as number & tags.Type<"int32">;
    const categoryCreateBody = {
      parent_id: null,
      slug: `cat-${index + 1}-${RandomGenerator.alphabets(6)}`,
      name_en: `Category ${index + 1}`,
      description_en: RandomGenerator.paragraph({ sentences: 4 }),
      status: "active",
      sort_order: sortOrder,
      is_leaf: true,
    } satisfies IShoppingMallCategory.ICreate;

    const category: IShoppingMallCategory =
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: categoryCreateBody,
      });
    typia.assert(category);
    createdCategories.push(category);
  }

  // Sanity check on category ordering by sort_order
  const sortedCategories = [...createdCategories].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  TestValidator.equals(
    "category sort_order sequence is 1..25",
    sortedCategories.map((c) => c.sort_order),
    createdCategories
      .map((_, i) => (i + 1) as number & tags.Type<"int32">)
      .sort((a, b) => a - b),
  );

  // 5. Link every category to the product via admin product-category create
  const linkedCategoryIds: (string & tags.Format<"uuid">)[] = [];

  for (let index = 0; index < sortedCategories.length; index++) {
    const category = sortedCategories[index];
    const linkCreateBody = {
      shopping_mall_category_id: category.id,
      is_primary: index === 0,
    } satisfies IShoppingMallProductCategory.ICreate;

    const link: IShoppingMallProductCategory =
      await api.functional.shoppingMall.admin.products.categories.create(
        connection,
        {
          productId,
          body: linkCreateBody,
        },
      );
    typia.assert(link);
    linkedCategoryIds.push(category.id);
  }

  TestValidator.equals(
    "linked category count matches created categories",
    linkedCategoryIds.length,
    totalCategories,
  );

  const expectedOrderedCategoryIds = sortedCategories.map((c) => c.id);

  // Helper to assert a page
  const assertPage = (
    title: string,
    page: number,
    limit: number,
    expectedIds: (string & tags.Format<"uuid">)[],
    priorIds: Set<string>,
  ) =>
    (async () => {
      const requestBody = {
        page: page as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
        orderBy: "sort_order",
        orderDirection: "asc" as const,
        categoryCodes: undefined,
        isPrimary: null,
      } satisfies IShoppingMallProductCategory.IRequest;

      const pageResult: IPageIShoppingMallProductCategory.ISummary =
        await api.functional.shoppingMall.admin.products.categories.index(
          connection,
          {
            productId,
            body: requestBody,
          },
        );
      typia.assert(pageResult);

      const pagination = pageResult.pagination;
      const data = pageResult.data;

      TestValidator.equals(
        `${title} - pagination.current`,
        pagination.current,
        page,
      );
      TestValidator.equals(
        `${title} - pagination.limit`,
        pagination.limit,
        limit,
      );
      TestValidator.equals(
        `${title} - pagination.records`,
        pagination.records,
        totalCategories,
      );
      const expectedPages = Math.ceil(totalCategories / limit);
      TestValidator.equals(
        `${title} - pagination.pages`,
        pagination.pages,
        expectedPages,
      );

      TestValidator.equals(
        `${title} - data length`,
        data.length,
        expectedIds.length,
      );

      const actualIds = data.map((s) => s.id);
      TestValidator.equals(
        `${title} - ids match expected window`,
        actualIds,
        expectedIds,
      );

      for (const id of actualIds) {
        TestValidator.predicate(
          `${title} - id not seen in previous pages`,
          !priorIds.has(id),
        );
        priorIds.add(id);
      }

      const sortedBySortOrder = [...data].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      TestValidator.equals(
        `${title} - data sorted by sort_order asc`,
        data,
        sortedBySortOrder,
      );

      const pageResultAgain: IPageIShoppingMallProductCategory.ISummary =
        await api.functional.shoppingMall.admin.products.categories.index(
          connection,
          {
            productId,
            body: requestBody,
          },
        );
      typia.assert(pageResultAgain);

      TestValidator.equals(
        `${title} - stable ordering on repeated call`,
        pageResultAgain.data.map((s) => s.id),
        actualIds,
      );

      return { pageResult, actualIds };
    })();

  const seenIds = new Set<string>();

  const page1ExpectedIds = expectedOrderedCategoryIds.slice(0, 10);
  const { pageResult: page1Result, actualIds: page1Ids } = await assertPage(
    "page 1",
    1,
    10,
    page1ExpectedIds,
    seenIds,
  );

  const page2ExpectedIds = expectedOrderedCategoryIds.slice(10, 20);
  const { pageResult: page2Result, actualIds: page2Ids } = await assertPage(
    "page 2",
    2,
    10,
    page2ExpectedIds,
    seenIds,
  );

  const page3ExpectedIds = expectedOrderedCategoryIds.slice(20, 25);
  const { pageResult: page3Result, actualIds: page3Ids } = await assertPage(
    "page 3",
    3,
    10,
    page3ExpectedIds,
    seenIds,
  );

  const combinedIds = [...page1Ids, ...page2Ids, ...page3Ids];
  TestValidator.equals(
    "combined ids length is totalCategories",
    combinedIds.length,
    totalCategories,
  );

  const uniqueCombinedIds = new Set(combinedIds);
  TestValidator.equals(
    "all ids across pages are unique",
    uniqueCombinedIds.size,
    totalCategories,
  );

  TestValidator.equals(
    "combined ids correspond to expectedOrderedCategoryIds",
    combinedIds,
    expectedOrderedCategoryIds,
  );

  const page4RequestBody = {
    page: 4 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "sort_order",
    orderDirection: "asc" as const,
    categoryCodes: undefined,
    isPrimary: null,
  } satisfies IShoppingMallProductCategory.IRequest;

  const page4Result: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId,
        body: page4RequestBody,
      },
    );
  typia.assert(page4Result);

  const page4Pagination = page4Result.pagination;
  TestValidator.equals(
    "page 4 - pagination.current",
    page4Pagination.current,
    4,
  );
  TestValidator.equals("page 4 - pagination.limit", page4Pagination.limit, 10);
  TestValidator.equals(
    "page 4 - pagination.records",
    page4Pagination.records,
    totalCategories,
  );
  TestValidator.equals("page 4 - pagination.pages", page4Pagination.pages, 3);
  TestValidator.equals("page 4 - data is empty", page4Result.data.length, 0);
}
