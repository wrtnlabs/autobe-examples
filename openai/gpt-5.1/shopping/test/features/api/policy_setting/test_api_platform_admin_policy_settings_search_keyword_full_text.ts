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
 * Validate keyword-based full-text search over policy setting profiles for a
 * platform admin.
 *
 * Business objective: Ensure that a platform administrator can create distinct
 * policy setting profiles and later retrieve them using PATCH
 * /shoppingMall/platformAdmin/policySettings with a `keyword` that is applied
 * over the name/description fields. The test verifies that only profiles
 * matching the keyword are returned and that non-matching profiles are excluded
 * from the current page.
 *
 * Test steps:
 *
 * 1. Join as a new platform admin via POST /auth/platformAdmin/join.
 *
 *    - Use IShoppingMallPlatformAdminJoin.IRequest to build the request body.
 *    - Typia.assert the returned IShoppingMallPlatformAdmin.IAuthorized to ensure a
 *         valid session and token are established. Rely on SDK-managed
 *         Authorization headers for subsequent calls.
 * 2. Create two policy setting profiles via POST
 *    /shoppingMall/platformAdmin/policySettings:
 *
 *    - Profile A ("HOLIDAY_POLICY_CODE") with name including "Holiday Cancellation
 *         Window" and a description mentioning holidays.
 *    - Profile B ("STANDARD_REFUND_CODE") with name/description that do not contain
 *         the word "Holiday", e.g. "Standard Refund Policy".
 *    - Use IShoppingMallPolicySetting.ICreate for request bodies and typia.assert on
 *         the responses (IShoppingMallPolicySetting) to validate
 *         server-populated fields.
 *    - Ensure both profiles share the same category (e.g., "cancellation") so that
 *         optional category-based filters can still see both records.
 * 3. Perform keyword search for Profile A:
 *
 *    - Build an IShoppingMallPolicySetting.IRequest with:
 *
 *         - Page = 1
 *         - PageSize = 10 (within Minimum<1> & Maximum<100>)
 *         - Keyword = "Holiday"
 *         - Category filter set to the chosen category (e.g., ["cancellation"]) so that
 *                   both created profiles are in scope if not filtered by
 *                   keyword.
 *    - Call api.functional.shoppingMall.platformAdmin.policySettings.index with this
 *         body and typia.assert the returned
 *         IPageIShoppingMallPolicySetting.ISummary.
 * 4. Validate keyword results for Profile A search:
 *
 *    - Extract the `data` array from the response and check:
 *
 *         - It contains an item whose `code` equals Profile A's code.
 *         - It does NOT contain any item whose `code` equals Profile B's code.
 *    - Also validate that pagination metadata (`pagination.records`,
 *         `pagination.pages`) is consistent with the number of items in `data`
 *         (records >= data.length, pages >= 1 when there is at least one
 *         record).
 * 5. Perform a second keyword search for Profile B (optional but recommended):
 *
 *    - Build another IShoppingMallPolicySetting.IRequest with keyword = "Standard"
 *         and identical pagination and category filters.
 *    - Call the index endpoint again and typia.assert the response.
 * 6. Validate keyword results for Profile B search:
 *
 *    - Confirm `data` contains Profile B (matching `code`) and does not contain
 *         Profile A, demonstrating that keyword search is symmetric and filters
 *         on name/description as expected.
 */
export async function test_api_platform_admin_policy_settings_search_keyword_full_text(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: `admin+${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create two policy setting profiles
  const category = "cancellation";

  const profileABody = {
    code: `HOLIDAY_POLICY_${RandomGenerator.alphaNumeric(6)}`,
    name: "Holiday Cancellation Window",
    category,
    description:
      "Policy governing holiday order cancellation windows and conditions.",
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const profileA: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: profileABody },
    );
  typia.assert(profileA);

  const profileBBody = {
    code: `STANDARD_REFUND_${RandomGenerator.alphaNumeric(6)}`,
    name: "Standard Refund Policy",
    category,
    description:
      "Policy describing standard refund eligibility and processing timelines.",
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const profileB: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: profileBBody },
    );
  typia.assert(profileB);

  // 3. Search with keyword that should match only Profile A: "Holiday"
  const searchHolidayBody = {
    page: 1,
    pageSize: 10,
    categories: [category],
    active: true,
    keyword: "Holiday",
    effectiveFromGte: undefined,
    effectiveFromLte: undefined,
    effectiveToGte: undefined,
    effectiveToLte: undefined,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IShoppingMallPolicySetting.IRequest;

  const holidayPage: IPageIShoppingMallPolicySetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.policySettings.index(
      connection,
      { body: searchHolidayBody },
    );
  typia.assert(holidayPage);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "holiday search pagination records >= data length",
    holidayPage.pagination.records >= holidayPage.data.length,
  );

  if (holidayPage.pagination.records > 0) {
    TestValidator.predicate(
      "holiday search pages >= 1 when records exist",
      holidayPage.pagination.pages >= 1,
    );
  }

  // Verify that Profile A is present and Profile B is absent
  const holidayCodes = holidayPage.data.map((p) => p.code);

  TestValidator.predicate(
    "holiday search includes Profile A code",
    holidayCodes.includes(profileA.code),
  );

  TestValidator.predicate(
    "holiday search excludes Profile B code",
    !holidayCodes.includes(profileB.code),
  );

  // 5. Search with keyword that should match Profile B: "Standard"
  const searchStandardBody = {
    page: 1,
    pageSize: 10,
    categories: [category],
    active: true,
    keyword: "Standard",
    effectiveFromGte: undefined,
    effectiveFromLte: undefined,
    effectiveToGte: undefined,
    effectiveToLte: undefined,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IShoppingMallPolicySetting.IRequest;

  const standardPage: IPageIShoppingMallPolicySetting.ISummary =
    await api.functional.shoppingMall.platformAdmin.policySettings.index(
      connection,
      { body: searchStandardBody },
    );
  typia.assert(standardPage);

  TestValidator.predicate(
    "standard search pagination records >= data length",
    standardPage.pagination.records >= standardPage.data.length,
  );

  if (standardPage.pagination.records > 0) {
    TestValidator.predicate(
      "standard search pages >= 1 when records exist",
      standardPage.pagination.pages >= 1,
    );
  }

  const standardCodes = standardPage.data.map((p) => p.code);

  TestValidator.predicate(
    "standard search includes Profile B code",
    standardCodes.includes(profileB.code),
  );

  TestValidator.predicate(
    "standard search excludes Profile A code",
    !standardCodes.includes(profileA.code),
  );
}
