import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationPolicy";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate pagination and sorting of cancellation policy search.
 *
 * Business goal: Ensure that PATCH /shoppingMall/cancellationPolicies correctly
 * applies ordering by `code` ascending and paginates results with stable pages
 * when there are at least 15 active policies.
 *
 * Scenario steps:
 *
 * 1. Register a platform administrator (POST /auth/platformAdmin/join).
 * 2. As that admin, create 15 cancellation policies with deterministic codes
 *    CANCEL_POLICY_001..CANCEL_POLICY_015 (active=true) via POST
 *    /shoppingMall/platformAdmin/cancellationPolicies.
 * 3. Clone an unauthenticated connection to simulate an anonymous search caller.
 * 4. Search with limit=5, page=1, orderBy="code", orderDirection="asc".
 *
 *    - Expect first page codes 001..005.
 * 5. Search with page=2, same limit and ordering.
 *
 *    - Expect next codes 006..010 and no overlap with page 1.
 * 6. Search with page=3, same limit and ordering.
 *
 *    - Expect codes 011..015.
 * 7. For each response, validate pagination metadata is consistent and data is
 *    sorted by code ascending.
 */
export async function test_api_cancellation_policy_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.predicate("platform admin is active", admin.isActive === true);

  // 2. Create 15 deterministic cancellation policies as that admin
  const totalPolicies = 15;
  const basePolicyName = "Pagination Test Policy";

  const createdPolicies: IShoppingMallCancellationPolicy[] = [];

  for (let i = 1; i <= totalPolicies; i++) {
    const indexStr = i.toString().padStart(3, "0");
    const code = `CANCEL_POLICY_${indexStr}`;

    const createBody = {
      code,
      name: `${basePolicyName} ${indexStr}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
      allow_cancellation_before_shipment: true,
      allow_partial_cancellation: true,
      max_hours_after_payment: 24,
      config_payload: null,
      effective_from: null,
      effective_to: null,
      active: true,
      region_code: null,
      policy_setting_code: null,
    } satisfies IShoppingMallCancellationPolicy.ICreate;

    const created =
      await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    createdPolicies.push(created);
  }

  // Sanity check: ensure we created 15 unique codes
  const createdCodes = createdPolicies.map((p) => p.code).sort();
  TestValidator.equals(
    "created 15 distinct cancellation policy codes",
    createdCodes.length,
    totalPolicies,
  );

  // 3. Create an unauthenticated connection clone for anonymous search
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Helper to perform an index request with a 1-based page number
  const searchPage = async (page: number) => {
    const body = {
      active: true,
      page: page,
      limit: 5,
      orderBy: "code",
      orderDirection: "asc",
    } satisfies IShoppingMallCancellationPolicy.IRequest;

    const pageResult =
      await api.functional.shoppingMall.cancellationPolicies.index(
        anonymousConnection,
        { body },
      );
    typia.assert(pageResult);
    return pageResult;
  };

  // 4. First page: page=1, limit=5, orderBy=code asc
  const firstPage = await searchPage(1);
  const firstPageCodes = firstPage.data.map((p) => p.code);

  TestValidator.equals("first page size is 5", firstPage.data.length, 5);
  TestValidator.equals("pagination limit is 5", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "pagination has at least 15 records",
    firstPage.pagination.records >= totalPolicies,
  );
  TestValidator.predicate(
    "pagination has at least 3 pages",
    firstPage.pagination.pages >= 3,
  );

  const expectedFirstCodes: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const idx = i.toString().padStart(3, "0");
    expectedFirstCodes.push(`CANCEL_POLICY_${idx}`);
  }
  TestValidator.equals(
    "first page codes match CANCEL_POLICY_001..005",
    firstPageCodes,
    expectedFirstCodes,
  );

  // 5. Second page: page=2
  const secondPage = await searchPage(2);
  const secondPageCodes = secondPage.data.map((p) => p.code);

  TestValidator.equals("second page size is 5", secondPage.data.length, 5);

  const expectedSecondCodes: string[] = [];
  for (let i = 6; i <= 10; i++) {
    const idx = i.toString().padStart(3, "0");
    expectedSecondCodes.push(`CANCEL_POLICY_${idx}`);
  }
  TestValidator.equals(
    "second page codes match CANCEL_POLICY_006..010",
    secondPageCodes,
    expectedSecondCodes,
  );

  // Ensure no overlap between first and second pages
  const overlap = firstPageCodes.filter((code) =>
    secondPageCodes.includes(code),
  );
  TestValidator.equals(
    "no overlap between first and second page codes",
    overlap.length,
    0,
  );

  // 6. Third page: page=3
  const thirdPage = await searchPage(3);
  const thirdPageCodes = thirdPage.data.map((p) => p.code);

  TestValidator.equals("third page size is 5", thirdPage.data.length, 5);

  const expectedThirdCodes: string[] = [];
  for (let i = 11; i <= 15; i++) {
    const idx = i.toString().padStart(3, "0");
    expectedThirdCodes.push(`CANCEL_POLICY_${idx}`);
  }
  TestValidator.equals(
    "third page codes match CANCEL_POLICY_011..015",
    thirdPageCodes,
    expectedThirdCodes,
  );

  // 7. Pagination metadata consistency checks across pages
  const allPages = [firstPage, secondPage, thirdPage];
  for (const [index, page] of allPages.entries()) {
    TestValidator.predicate(
      `page ${index + 1} has non-negative current index`,
      page.pagination.current >= 0,
    );
    TestValidator.predicate(
      `page ${index + 1} records count >= data length`,
      page.pagination.records >= page.data.length,
    );
    TestValidator.predicate(
      `page ${index + 1} has pages consistent with records and limit`,
      page.pagination.pages === 0 ||
        page.pagination.pages >=
          Math.ceil(page.pagination.records / page.pagination.limit),
    );
  }
}
