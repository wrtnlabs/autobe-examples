import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicyVersion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate full-text search for business policy versions.
 *
 * Business context: Administrators manage versioned business policies (such as
 * refund or shipping policies). This test ensures that the version listing
 * endpoint for a given policy correctly applies free-text search over version
 * titles so admins can locate relevant policy versions by keyword.
 *
 * Scenario:
 *
 * 1. Register an admin account (POST /auth/admin/join) to obtain an authenticated
 *    admin session.
 * 2. Create a business policy definition (POST
 *    /shoppingMall/admin/businessPolicies) and capture its policy_code.
 * 3. Under that policy, create three versions with clearly distinct titles:
 *
 *    - One containing keyword "holiday_refund" in the title.
 *    - One containing keyword "express_shipping" in the title.
 *    - One control version with neither keyword.
 * 4. Call the policy versions search endpoint (PATCH
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions) with
 *    search="holiday_refund" and a sufficiently large limit.
 *
 *    - Assert that: a) The response has valid pagination and data structure. b) All
 *         returned summaries have titles containing "holiday_refund". c) The
 *         version created with the "holiday_refund" title is present in the
 *         result set. d) The control version without the keyword does not
 *         appear.
 * 5. Repeat the search with search="express_shipping" and perform the analogous
 *    assertions for that keyword.
 */
export async function test_api_business_policy_versions_search_full_text_search(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy.
  const policyCodeBase = `policy_full_text_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCodeBase,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(policy);

  // 3. Create three versions with distinct titles.
  const holidayKeyword = "holiday_refund";
  const expressKeyword = "express_shipping";

  const holidayVersionCode = `v-holiday-${RandomGenerator.alphaNumeric(6)}`;
  const expressVersionCode = `v-express-${RandomGenerator.alphaNumeric(6)}`;
  const controlVersionCode = `v-control-${RandomGenerator.alphaNumeric(6)}`;

  const nowIso = new Date().toISOString();

  const holidayVersionBody = {
    version_code: holidayVersionCode,
    title: `Policy for ${holidayKeyword}`,
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const expressVersionBody = {
    version_code: expressVersionCode,
    title: `Policy for ${expressKeyword}`,
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const controlVersionBody = {
    version_code: controlVersionCode,
    title: "Generic refund policy",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const holidayVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: holidayVersionBody,
      },
    );
  typia.assert(holidayVersion);

  const expressVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: expressVersionBody,
      },
    );
  typia.assert(expressVersion);

  const controlVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: controlVersionBody,
      },
    );
  typia.assert(controlVersion);

  const limit = 20 as number & tags.Type<"int32">;

  // 4. Search with keyword "holiday_refund".
  const holidaySearchRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit,
    status: null,
    effective_from_gte: null,
    effective_from_lte: null,
    search: holidayKeyword,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallPolicyVersion.IRequest;

  const holidayPage: IPageIShoppingMallPolicyVersion.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.versions.index(
      connection,
      {
        policyCode: policy.policy_code,
        body: holidaySearchRequestBody,
      },
    );
  typia.assert(holidayPage);

  // Basic pagination validations.
  TestValidator.equals(
    "holiday search - page current is 1",
    holidayPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "holiday search - limit is at least number of records",
    holidayPage.pagination.limit >= holidayPage.pagination.records,
  );

  // Ensure that at least one result is returned.
  TestValidator.predicate(
    "holiday search - at least one version returned",
    holidayPage.pagination.records > 0 && holidayPage.data.length > 0,
  );

  // Every returned summary's title should contain the keyword.
  const allHolidayTitlesContainKeyword = holidayPage.data.every((summary) =>
    summary.title.includes(holidayKeyword),
  );
  TestValidator.predicate(
    "holiday search - all titles contain holiday_refund keyword",
    allHolidayTitlesContainKeyword,
  );

  // Our specific holiday version must be present.
  const holidayVersionFound = holidayPage.data.some(
    (summary) => summary.version_code === holidayVersionCode,
  );
  TestValidator.predicate(
    "holiday search - created holiday version is included",
    holidayVersionFound,
  );

  // Control version should not be present.
  const controlInHoliday = holidayPage.data.some(
    (summary) => summary.version_code === controlVersionCode,
  );
  TestValidator.predicate(
    "holiday search - control version is excluded",
    controlInHoliday === false,
  );

  // 5. Search with keyword "express_shipping".
  const expressSearchRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit,
    status: null,
    effective_from_gte: null,
    effective_from_lte: null,
    search: expressKeyword,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallPolicyVersion.IRequest;

  const expressPage: IPageIShoppingMallPolicyVersion.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.versions.index(
      connection,
      {
        policyCode: policy.policy_code,
        body: expressSearchRequestBody,
      },
    );
  typia.assert(expressPage);

  TestValidator.equals(
    "express search - page current is 1",
    expressPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "express search - limit is at least number of records",
    expressPage.pagination.limit >= expressPage.pagination.records,
  );

  TestValidator.predicate(
    "express search - at least one version returned",
    expressPage.pagination.records > 0 && expressPage.data.length > 0,
  );

  const allExpressTitlesContainKeyword = expressPage.data.every((summary) =>
    summary.title.includes(expressKeyword),
  );
  TestValidator.predicate(
    "express search - all titles contain express_shipping keyword",
    allExpressTitlesContainKeyword,
  );

  const expressVersionFound = expressPage.data.some(
    (summary) => summary.version_code === expressVersionCode,
  );
  TestValidator.predicate(
    "express search - created express version is included",
    expressVersionFound,
  );

  const controlInExpress = expressPage.data.some(
    (summary) => summary.version_code === controlVersionCode,
  );
  TestValidator.predicate(
    "express search - control version is excluded",
    controlInExpress === false,
  );

  const holidayInExpress = expressPage.data.some(
    (summary) => summary.version_code === holidayVersionCode,
  );
  TestValidator.predicate(
    "express search - holiday version is excluded",
    holidayInExpress === false,
  );
}
