import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogBlockReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Validate filtering of catalog block reasons by severity levels for admin.
 *
 * Business purpose:
 *
 * - Ensure that the admin-facing catalog block reason search endpoint can filter
 *   by one or more severity levels using the `severity_levels` field in
 *   IShoppingMallCatalogBlockReason.IRequest.
 * - Confirm that the response only contains reasons whose severity_level is in
 *   the requested list and that we can retrieve both low and high severity
 *   reasons when multiple levels are requested.
 *
 * Test steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Seed catalog block reasons via POST /shoppingMall/admin/catalogBlockReasons:
 *
 *    - One with severity_level "low".
 *    - One with severity_level "high".
 *    - One with severity_level "medium" (to validate exclusion when filtering by
 *         only low/high).
 * 3. Call PATCH /shoppingMall/admin/catalogBlockReasons with severity_levels:
 *    ["high"].
 *
 *    - Assert that at least the created high-severity reason is returned.
 *    - Assert that all returned summaries have severity_level === "high".
 * 4. Call PATCH /shoppingMall/admin/catalogBlockReasons with severity_levels:
 *    ["low", "high"].
 *
 *    - Assert that at least one low-severity and one high-severity seeded reason
 *         appear in the results.
 *    - Assert that no summary has a severity_level outside of "low" or "high"
 *         (thereby excluding the medium record).
 */
export async function test_api_admin_catalog_block_reasons_filter_by_severity_levels(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed catalog block reasons with low, high, and medium severities
  const lowReasonBody = {
    code: `reason_low_${RandomGenerator.alphaNumeric(8)}`,
    name: `Low severity reason ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    severity_level: "low",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const highReasonBody = {
    code: `reason_high_${RandomGenerator.alphaNumeric(8)}`,
    name: `High severity reason ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    severity_level: "high",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const mediumReasonBody = {
    code: `reason_medium_${RandomGenerator.alphaNumeric(8)}`,
    name: `Medium severity reason ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    severity_level: "medium",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const lowReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      { body: lowReasonBody },
    );
  typia.assert(lowReason);

  const highReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      { body: highReasonBody },
    );
  typia.assert(highReason);

  const mediumReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      { body: mediumReasonBody },
    );
  typia.assert(mediumReason);

  // 3. Filter by single severity level: ["high"]
  const highFilterRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    severity_levels: ["high"],
  } satisfies IShoppingMallCatalogBlockReason.IRequest;

  const highFilterPage: IPageIShoppingMallCatalogBlockReason.ISummary =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      { body: highFilterRequest },
    );
  typia.assert(highFilterPage);

  // Ensure at least one high severity reason is returned (specifically our seeded one)
  const highFound = highFilterPage.data.some(
    (summary) => summary.id === highReason.id,
  );
  TestValidator.predicate(
    "high severity filter should include the created high severity reason",
    highFound,
  );

  // Ensure all returned items have severity_level === "high"
  const allHigh = highFilterPage.data.every(
    (summary) => summary.severity_level === "high",
  );
  TestValidator.predicate(
    "all reasons returned when filtering by [\"high\"] must have severity_level 'high'",
    allHigh,
  );

  // 4. Filter by multiple severity levels: ["low", "high"]
  const lowHighFilterRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    severity_levels: ["low", "high"],
  } satisfies IShoppingMallCatalogBlockReason.IRequest;

  const lowHighFilterPage: IPageIShoppingMallCatalogBlockReason.ISummary =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      { body: lowHighFilterRequest },
    );
  typia.assert(lowHighFilterPage);

  // Ensure at least one low severity and one high severity seeded reason appear
  const lowFound = lowHighFilterPage.data.some(
    (summary) => summary.id === lowReason.id,
  );
  const highFoundInLowHigh = lowHighFilterPage.data.some(
    (summary) => summary.id === highReason.id,
  );

  TestValidator.predicate(
    "multi-severity filter [low, high] should include the created low severity reason",
    lowFound,
  );
  TestValidator.predicate(
    "multi-severity filter [low, high] should include the created high severity reason",
    highFoundInLowHigh,
  );

  // Ensure no reasons outside of low/high are returned (e.g., the medium record)
  const onlyLowOrHigh = lowHighFilterPage.data.every(
    (summary) =>
      summary.severity_level === "low" || summary.severity_level === "high",
  );
  TestValidator.predicate(
    "when filtering by [low, high], no reasons with other severities should be returned",
    onlyLowOrHigh,
  );

  const mediumPresent = lowHighFilterPage.data.some(
    (summary) => summary.id === mediumReason.id,
  );
  TestValidator.predicate(
    "multi-severity filter [low, high] should exclude the created medium severity reason",
    mediumPresent === false,
  );
}
