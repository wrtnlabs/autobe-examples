import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Validate admin free-text search and pagination on product tags.
 *
 * Business flow:
 *
 * 1. Admin joins via POST /auth/admin/join and becomes authenticated (SDK sets
 *    Authorization header).
 * 2. Admin seeds multiple product tags via POST /shoppingMall/admin/productTags
 *    with varying codes/labels/descriptions.
 * 3. Admin searches tags via PATCH /shoppingMall/admin/productTags with
 *    IShoppingMallProductTag.IRequest:
 *
 *    - Search: common substring that matches a subset of seeded tags (by name or
 *         slug per docs).
 *    - Page: 1
 *    - Page_size: fixed size (e.g., 5 or 10)
 *    - Sort_by / sort_direction: null to let backend apply defaults.
 * 4. Assert pagination metadata matches request and is self-consistent.
 * 5. Assert returned summaries all respect the search keyword.
 * 6. When enough tags exist, fetch page 2 and ensure no overlaps between page 1
 *    and 2 while combined IDs are subset of matching tags.
 */
export async function test_api_admin_search_product_tags_with_text_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed product tags with varying codes/labels/descriptions
  const searchKeyword = "summer";

  const makeTagBodies = (): IShoppingMallProductTag.ICreate[] => [
    {
      code: `code-${RandomGenerator.alphaNumeric(6)}-summer`,
      label: `Summer Sale ${RandomGenerator.alphabets(4)}`,
      description: RandomGenerator.paragraph({ sentences: 5 }),
      isActive: true,
    },
    {
      code: `winter-${RandomGenerator.alphaNumeric(6)}`,
      label: `Winter Clearance ${RandomGenerator.alphabets(4)}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
      isActive: true,
    },
    {
      code: `vip-${RandomGenerator.alphaNumeric(6)}`,
      label: `VIP Only ${RandomGenerator.alphabets(4)}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      isActive: true,
    },
  ];

  // Ensure multiple tags that contain the searchKeyword in label
  const createBodies: IShoppingMallProductTag.ICreate[] = [
    {
      code: `summer-sale-${RandomGenerator.alphaNumeric(4)}`,
      label: `summer-sale-${RandomGenerator.alphabets(3)}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      isActive: true,
    },
    {
      code: `summer-promo-${RandomGenerator.alphaNumeric(4)}`,
      label: `Big summer promotion ${RandomGenerator.alphabets(3)}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
      isActive: true,
    },
    ...ArrayUtil.repeat(8, () => RandomGenerator.pick(makeTagBodies())),
  ];

  const createdTags: IShoppingMallProductTag[] = [];
  for (const body of createBodies) {
    const created: IShoppingMallProductTag =
      await api.functional.shoppingMall.admin.productTags.create(connection, {
        body,
      });
    typia.assert(created);
    createdTags.push(created);
  }

  // Build a view of which created tags should match the free-text search
  const lowerKeyword = searchKeyword.toLowerCase();
  const expectedMatching: IShoppingMallProductTag[] = createdTags.filter(
    (tag) => {
      const name = tag.name.toLowerCase();
      const slug = tag.slug.toLowerCase();
      return name.includes(lowerKeyword) || slug.includes(lowerKeyword);
    },
  );

  TestValidator.predicate(
    "there should be at least one tag matching the search keyword",
    expectedMatching.length > 0,
  );

  // 3. First search request with page 1
  const pageSize = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestPage1 = {
    search: searchKeyword,
    created_from: null,
    created_to: null,
    updated_from: null,
    updated_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: pageSize,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallProductTag.IRequest;

  const page1: IPageIShoppingMallProductTag.ISummary =
    await api.functional.shoppingMall.admin.productTags.index(connection, {
      body: requestPage1,
    });
  typia.assert(page1);

  // 4. Pagination metadata assertions for page 1
  const pagination1 = page1.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  TestValidator.equals(
    "pagination.current should equal requested page 1",
    pagination1.current,
    requestPage1.page,
  );

  TestValidator.equals(
    "pagination.limit should equal requested page_size",
    pagination1.limit,
    requestPage1.page_size,
  );

  TestValidator.predicate(
    "pagination.records should be at least the number of expected matching tags",
    pagination1.records >= (expectedMatching.length as number),
  );

  // pages = ceil(records / limit)
  const expectedPages =
    pagination1.limit === 0
      ? 0
      : Math.ceil(pagination1.records / pagination1.limit);

  TestValidator.equals(
    "pagination.pages should equal ceil(records/limit)",
    pagination1.pages,
    expectedPages,
  );

  // 5. Assert that all returned summaries respect the search keyword
  const idsPage1 = page1.data.map((summary) => {
    typia.assert<IShoppingMallProductTag.ISummary>(summary);
    return summary.id;
  });

  for (const summary of page1.data) {
    const combined = `${summary.name} ${summary.slug}`.toLowerCase();
    TestValidator.predicate(
      "every returned tag on page 1 should contain the search keyword in name or slug",
      combined.includes(lowerKeyword),
    );
  }

  // 6. Optional second page validation when there are multiple pages
  if (pagination1.pages > 1) {
    const requestPage2 = {
      ...requestPage1,
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallProductTag.IRequest;

    const page2: IPageIShoppingMallProductTag.ISummary =
      await api.functional.shoppingMall.admin.productTags.index(connection, {
        body: requestPage2,
      });
    typia.assert(page2);

    const pagination2 = page2.pagination;
    typia.assert<IPage.IPagination>(pagination2);

    TestValidator.equals(
      "pagination.current for page 2 should equal 2",
      pagination2.current,
      requestPage2.page,
    );

    TestValidator.equals(
      "pagination.limit for page 2 should equal requested page_size",
      pagination2.limit,
      requestPage2.page_size,
    );

    const idsPage2 = page2.data.map((summary) => {
      typia.assert<IShoppingMallProductTag.ISummary>(summary);
      return summary.id;
    });

    // Ensure no overlapping IDs between page 1 and page 2
    const overlappingIds = idsPage1.filter((id) => idsPage2.includes(id));
    TestValidator.equals(
      "page 1 and page 2 should not have overlapping tag IDs",
      overlappingIds.length,
      0,
    );

    // Ensure all page 2 entries respect search keyword
    for (const summary of page2.data) {
      const combined = `${summary.name} ${summary.slug}`.toLowerCase();
      TestValidator.predicate(
        "every returned tag on page 2 should contain the search keyword in name or slug",
        combined.includes(lowerKeyword),
      );
    }
  }
}
