import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicySetting";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

/**
 * Validate that platform admin policy settings search supports pagination and
 * sorting.
 *
 * Business flow:
 *
 * 1. Join as a platform admin to obtain an authenticated session.
 * 2. Create three policy settings in the same category with deterministic codes.
 * 3. Search with page=1, pageSize=2 ordered by code asc and validate pagination
 *    and ordering.
 * 4. Search with page=2, pageSize=2 and validate the remaining record and no
 *    overlap.
 */
export async function test_api_platform_admin_policy_settings_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create three deterministic policy settings in the same category
  const category = "cancellation";
  const baseCode = "pagination-test-code-";

  const createdPolicies: IShoppingMallPolicySetting[] = [];

  for (let index = 1; index <= 3; index++) {
    const code = `${baseCode}${index}`;
    const policyBody = {
      code,
      name: `Policy ${index}`,
      category,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      config_payload: RandomGenerator.content({ paragraphs: 1 }),
      active: true,
      effective_from: null,
      effective_to: null,
    } satisfies IShoppingMallPolicySetting.ICreate;

    const created =
      await api.functional.shoppingMall.platformAdmin.policySettings.create(
        connection,
        { body: policyBody },
      );
    typia.assert(created);
    createdPolicies.push(created);
  }

  // Sort the in-memory reference array by code asc for expectations
  const expectedSorted = [...createdPolicies].sort((a, b) =>
    a.code.localeCompare(b.code),
  );

  TestValidator.equals(
    "created policies count should be 3",
    createdPolicies.length,
    3,
  );

  // 3. Search page=1, pageSize=2 ordered by code asc
  const searchRequestPage1 = {
    page: 1,
    pageSize: 2,
    categories: [category],
    active: true,
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IShoppingMallPolicySetting.IRequest;

  const page1 =
    await api.functional.shoppingMall.platformAdmin.policySettings.index(
      connection,
      { body: searchRequestPage1 },
    );
  typia.assert<IPageIShoppingMallPolicySetting.ISummary>(page1);

  const pagination1: IPage.IPagination = page1.pagination;

  TestValidator.equals(
    "page1 current index should be 0 (first page)",
    pagination1.current,
    0,
  );
  TestValidator.equals(
    "page1 limit should match pageSize=2",
    pagination1.limit,
    2,
  );
  TestValidator.equals(
    "pagination records should equal number of created policies",
    pagination1.records,
    expectedSorted.length,
  );
  TestValidator.equals(
    "pagination pages should be ceil(records/limit) = 2 when records=3 and limit=2",
    pagination1.pages,
    2,
  );

  TestValidator.equals("page1 data length should be 2", page1.data.length, 2);

  // Verify the first two policies are returned in ascending code order
  const expectedPage1Codes = expectedSorted.slice(0, 2).map((p) => p.code);
  const actualPage1Codes = page1.data.map((p) => p.code);

  TestValidator.equals(
    "page1 codes should match first two expected codes in ascending order",
    actualPage1Codes,
    expectedPage1Codes,
  );

  // 4. Search page=2, pageSize=2 ordered by code asc
  const searchRequestPage2 = {
    page: 2,
    pageSize: 2,
    categories: [category],
    active: true,
    orderBy: "code",
    orderDirection: "asc",
  } satisfies IShoppingMallPolicySetting.IRequest;

  const page2 =
    await api.functional.shoppingMall.platformAdmin.policySettings.index(
      connection,
      { body: searchRequestPage2 },
    );
  typia.assert<IPageIShoppingMallPolicySetting.ISummary>(page2);

  const pagination2: IPage.IPagination = page2.pagination;

  TestValidator.equals(
    "page2 current index should be 1 (second page)",
    pagination2.current,
    1,
  );
  TestValidator.equals(
    "page2 limit should match pageSize=2",
    pagination2.limit,
    2,
  );
  TestValidator.equals(
    "page2 records should equal number of created policies",
    pagination2.records,
    expectedSorted.length,
  );
  TestValidator.equals(
    "page2 pages should be consistent with page1",
    pagination2.pages,
    pagination1.pages,
  );

  // For 3 total records and pageSize=2, second page should contain remaining 1
  TestValidator.equals(
    "page2 data length should be 1 (remaining record)",
    page2.data.length,
    1,
  );

  const expectedPage2Codes = expectedSorted.slice(2).map((p) => p.code);
  const actualPage2Codes = page2.data.map((p) => p.code);

  TestValidator.equals(
    "page2 codes should match remaining expected code(s)",
    actualPage2Codes,
    expectedPage2Codes,
  );

  // Ensure no overlap between page1 and page2
  const overlap = actualPage1Codes.filter((code) =>
    actualPage2Codes.includes(code),
  );

  TestValidator.equals(
    "there should be no overlapping codes between page1 and page2",
    overlap.length,
    0,
  );
}
