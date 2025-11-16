import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRole";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_admin_role_search_pagination_across_pages(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.test-platform.example/join", // valid URI
    referrer: "https://admin.test-platform.example/landing", // valid URI
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Seed 25 distinct admin roles
  const seedCount = 25;
  const baseCodePrefix = `TEST_ROLE_${RandomGenerator.alphaNumeric(6)}_`;

  const createdRoles: IShoppingMallAdminRole[] = [];
  for (let i = 0; i < seedCount; i++) {
    const createBody = {
      code: `${baseCodePrefix}${i}`,
      name: `Test Role ${i}`,
      description_text: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
    } satisfies IShoppingMallAdminRole.ICreate;

    const role: IShoppingMallAdminRole =
      await api.functional.shoppingMall.platformAdmin.adminRoles.create(
        connection,
        { body: createBody },
      );
    typia.assert(role);
    createdRoles.push(role);
  }

  // Helper to extract codes from a page response
  const collectCodes = (page: IPageIShoppingMallAdminRole.ISummary): string[] =>
    page.data.map((r) => r.code);

  const limit = 10;

  // 3. Fetch page 1 (1-based page index in request)
  const page1Body = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdminRole.IRequest;

  const page1: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminRoles.index(
      connection,
      {
        body: page1Body,
      },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const page1Codes = collectCodes(page1);

  // Validate pagination meta for page 1
  TestValidator.equals(
    "page1.pagination.limit equals requested limit",
    pagination1.limit,
    limit,
  );
  TestValidator.equals(
    "page1.pagination.current is 0-based index for page 1",
    pagination1.current,
    0,
  );
  TestValidator.predicate(
    "page1.pagination.records is at least number of seeded roles",
    pagination1.records >= createdRoles.length,
  );
  TestValidator.predicate(
    "page1.pagination.pages non-negative and consistent with records",
    pagination1.pages >= 0 &&
      (pagination1.records === 0 || pagination1.pages >= 1),
  );
  TestValidator.predicate(
    "page1.data length is within [0, limit] and non-empty when records > 0",
    page1.data.length <= limit &&
      (pagination1.records === 0 || page1.data.length > 0),
  );

  // 4. Fetch page 2
  const page2Body = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdminRole.IRequest;

  const page2: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminRoles.index(
      connection,
      {
        body: page2Body,
      },
    );
  typia.assert(page2);

  const pagination2 = page2.pagination;
  const page2Codes = collectCodes(page2);

  TestValidator.equals(
    "page2.pagination.limit equals requested limit",
    pagination2.limit,
    limit,
  );
  TestValidator.equals(
    "page2.pagination.current is 0-based index for page 2",
    pagination2.current,
    1,
  );
  TestValidator.predicate(
    "page2.data length is within [0, limit] and non-empty when records > limit",
    page2.data.length <= limit &&
      (pagination2.records <= limit || page2.data.length > 0),
  );

  // Ensure uniqueness within page 2
  TestValidator.predicate(
    "page2 role codes are unique within page",
    new Set(page2Codes).size === page2Codes.length,
  );

  // Ensure no overlap between page1 and page2 codes
  const allCodesFirstTwoPages = [...page1Codes, ...page2Codes];
  TestValidator.predicate(
    "page1 and page2 role codes do not overlap",
    new Set(allCodesFirstTwoPages).size === allCodesFirstTwoPages.length,
  );

  // Ensure combined visible roles across first two pages respect records
  TestValidator.predicate(
    "combined first two pages cover up to 2*limit unique roles",
    allCodesFirstTwoPages.length <= 2 * limit,
  );

  // 5. Fetch page 3
  const page3Body = {
    page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdminRole.IRequest;

  const page3: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminRoles.index(
      connection,
      {
        body: page3Body,
      },
    );
  typia.assert(page3);

  const pagination3 = page3.pagination;
  const page3Codes = collectCodes(page3);

  TestValidator.equals(
    "page3.pagination.limit equals requested limit",
    pagination3.limit,
    limit,
  );
  TestValidator.equals(
    "page3.pagination.current is 0-based index for page 3",
    pagination3.current,
    2,
  );
  TestValidator.predicate(
    "page3.data length is within [0, limit]",
    page3.data.length <= limit,
  );

  // If total records are at least 21, there should be at least 3 pages
  TestValidator.predicate(
    "when records >= 21, pages >= 3",
    pagination3.records < 21 || pagination3.pages >= 3,
  );

  // Union across three pages should have no duplicates
  const allCodesFirstThreePages = [...page1Codes, ...page2Codes, ...page3Codes];
  TestValidator.predicate(
    "codes across first three pages are unique",
    new Set(allCodesFirstThreePages).size === allCodesFirstThreePages.length,
  );

  // 6. Optional: request beyond last page and validate bounds
  if (pagination1.pages > 0) {
    const beyondPageOneBased = pagination1.pages + 1; // request one page beyond last

    const beyondBody = {
      page: beyondPageOneBased as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallAdminRole.IRequest;

    const beyond: IPageIShoppingMallAdminRole.ISummary =
      await api.functional.shoppingMall.platformAdmin.adminRoles.index(
        connection,
        { body: beyondBody },
      );
    typia.assert(beyond);

    const paginationBeyond = beyond.pagination;

    TestValidator.predicate(
      "beyond-page pagination.current is within [0, pages-1]",
      paginationBeyond.pages === 0 ||
        (paginationBeyond.current >= 0 &&
          paginationBeyond.current < paginationBeyond.pages),
    );
    TestValidator.predicate(
      "beyond-page data length is within [0, limit]",
      beyond.data.length <= limit,
    );
  }
}
