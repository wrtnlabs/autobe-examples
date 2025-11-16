import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFraudRuleViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFraudRuleViolation";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallFraudRuleViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleViolation";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform admin can perform advanced filtered search over
 * fraud rule violations.
 *
 * ## Business goal
 *
 * Ensure that an authenticated platform administrator can:
 *
 * 1. Register (join) and obtain an authorized admin session with tokens.
 * 2. Configure multiple fraud rule definitions, each with unique business
 *    `ruleCode` and different scopes/severities.
 * 3. Call the analytics search endpoint for fraud rule violations with an
 *    "advanced" set of filters (ruleCodes, entityTypes, severity band,
 *    decisionOutcomes, and createdFrom/createdTo window) and receive a
 *    well-typed paginated response.
 * 4. When violations are returned, verify that they all respect at least the
 *    ruleCodes and created_at time window filters and that actor information is
 *    consistently populated.
 *
 * ## Important limitations
 *
 * - There is no endpoint to create fraud rule violations deterministically.
 *   Therefore, this test cannot enforce that violations exist for the rules
 *   just created; instead it validates **filter correctness over any returned
 *   data**. If the dataset is empty, the test must still pass as long as the
 *   response type and pagination metadata are valid.
 * - IShoppingMallFraudRuleViolation.IRequest expresses `minSeverity` and
 *   `maxSeverity` as numbers, whereas the violation summary exposes a string
 *   `severity` (e.g., "high", "critical"). The test cannot assert numeric band
 *   membership from the summary and should only verify that the request is
 *   accepted and the response is structurally correct.
 * - `decisionOutcomes` is a filter field on IRequest but there is no dedicated
 *   decision outcome field on ISummary; do not attempt to assert decision
 *   outcomes from the response, only that the request including this filter
 *   succeeds.
 * - `entityTypes` represent domain-specific entity categories, but the summary
 *   only contains `actor_type`. The test must not over-interpret or equate
 *   these; it can only verify that `actor_type` is a populated string when
 *   records exist.
 *
 * ## High-level scenario
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join with a
 *    realistic payload (random email, name, password, and href/referrer URIs).
 *    Validate the IShoppingMallPlatformAdmin.IAuthorized response with
 *    typia.assert so that the shared `connection` carries an Authorization
 *    header for subsequent admin-only calls.
 * 2. As the platform admin, create two fraud rule definitions via POST
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions using
 *    IShoppingMallFraudRuleDefinition.ICreate:
 *
 *    - Rule A: scope "payment", severity "high", isEnabled true
 *    - Rule B: scope "order", severity "medium", isEnabled true Use unique random
 *         `ruleCode` values, and simple JSON strings for the
 *         ruleExpression/condition. Assert each created
 *         IShoppingMallFraudRuleDefinition with typia.assert.
 * 3. Build an advanced filter request body based on
 *    IShoppingMallFraudRuleViolation.IRequest that includes:
 *
 *    - Page: 1 (1-based request), limit: 50
 *    - RuleCodes: [ruleA.ruleCode]
 *    - EntityTypes: ["paymentTransaction"]
 *    - MinSeverity: 10, maxSeverity: 90 (arbitrary numeric band)
 *    - Status: ["open", "inReview"] (example workflow states)
 *    - DecisionOutcomes: ["block", "review"]
 *    - CreatedFrom/createdTo: ISO strings representing a short time window around
 *         the current time (e.g., now minus 1 day to now plus 1 day).
 * 4. Call PATCH /shoppingMall/platformAdmin/analytics/fraudViolations using the
 *    advanced filter body. Validate the response with
 *    typia.assert<IPageIShoppingMallFraudRuleViolation.ISummary>().
 * 5. Inspect pagination metadata:
 *
 *    - Assert that `pagination.current` is >= 0 and < `pagination.pages` when
 *         `pagination.pages` > 0.
 *    - Assert that `pagination.limit` is the same as the requested limit or at least
 *
 * > 0.
 * 6. If `data.length > 0`, iterate over each violation and assert with
 *    TestValidator:
 *
 *    - `rule_definition.rule_code` equals the single requested rule code (ensures
 *         ruleCodes filter correctness for any hits).
 *    - `actor_type` and `actor_id` are non-empty strings.
 *    - `created_at` is within the [createdFrom, createdTo] window by parsing to Date
 *         objects and comparing timestamps.
 * 7. Optionally, perform a broader second search without the ruleCodes filter (or
 *    with a looser time window) and assert that:
 *
 *    - The response is valid via typia.assert.
 *    - If both the narrow and broad searches have non-empty data,
 *         `pagination.records` in the broad search is greater than or equal to
 *         the narrow search, demonstrating that filters narrow the dataset.
 *
 * The test deliberately avoids asserting result count minima or specific
 * decision outcomes because those aspects depend on external fraud engine
 * behavior and underlying data, which are outside this test's control. The
 * focus is on type safety, access control (admin-only), and logical consistency
 * of filters for any data that is actually returned.
 */
export async function test_api_platform_admin_fraud_rule_violations_search_with_advanced_filters(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin and obtain an authorized session.
  const joinRequestBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(admin);

  // 2. Create two fraud rule definitions with distinct rule codes and scopes.
  const ruleCodeA = `PAYMENT_HIGH_${RandomGenerator.alphaNumeric(6)}`;
  const ruleCodeB = `ORDER_MEDIUM_${RandomGenerator.alphaNumeric(6)}`;

  const createRuleABody = {
    ruleCode: ruleCodeA,
    name: "High risk payment velocity",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: "payment",
    severity: "high",
    ruleExpression: JSON.stringify({
      type: "velocity",
      windowMinutes: 30,
      maxCount: 5,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const ruleA: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: createRuleABody },
    );
  typia.assert(ruleA);

  const createRuleBBody = {
    ruleCode: ruleCodeB,
    name: "Medium risk order basket",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "order",
    severity: "medium",
    ruleExpression: JSON.stringify({
      type: "basket_value",
      threshold: 100000,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const ruleB: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: createRuleBBody },
    );
  typia.assert(ruleB);

  // 3. Prepare advanced filter for analytics search.
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const createdFrom = new Date(now.getTime() - oneDayMs).toISOString();
  const createdTo = new Date(now.getTime() + oneDayMs).toISOString();

  const narrowFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "created_at",
    sortOrder: "desc",
    ruleCodes: [ruleA.ruleCode],
    entityTypes: ["paymentTransaction"],
    entityIds: undefined,
    minSeverity: 10,
    maxSeverity: 90,
    status: ["open", "inReview"],
    decisionOutcomes: ["block", "review"],
    createdFrom,
    createdTo,
    updatedFrom: undefined,
    updatedTo: undefined,
    search: undefined,
  } satisfies IShoppingMallFraudRuleViolation.IRequest;

  const narrowResult: IPageIShoppingMallFraudRuleViolation.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.fraudViolations.index(
      connection,
      { body: narrowFilterBody },
    );
  typia.assert(narrowResult);

  // 4. Validate pagination metadata for narrow search.
  const narrowPage: IPage.IPagination = narrowResult.pagination;

  TestValidator.predicate(
    "narrow search pagination.limit should be positive",
    narrowPage.limit > 0,
  );

  TestValidator.predicate(
    "narrow search pagination.current non-negative",
    narrowPage.current >= 0,
  );

  TestValidator.predicate(
    "narrow search pagination.pages non-negative",
    narrowPage.pages >= 0,
  );

  if (narrowPage.pages > 0) {
    TestValidator.predicate(
      "narrow search current page index should be within pages range",
      narrowPage.current < narrowPage.pages,
    );
  }

  // 5. If violations are returned, validate they respect ruleCodes and time window.
  const narrowData = narrowResult.data;
  if (narrowData.length > 0) {
    const fromTs = new Date(createdFrom).getTime();
    const toTs = new Date(createdTo).getTime();

    for (const violation of narrowData) {
      // All rule_definition.rule_code must equal the requested rule code.
      TestValidator.equals(
        "violation rule_code matches requested ruleCodes filter",
        violation.rule_definition.rule_code,
        ruleA.ruleCode,
      );

      // actor_type and actor_id should be non-empty strings.
      TestValidator.predicate(
        "violation actor_type is non-empty string",
        typeof violation.actor_type === "string" &&
          violation.actor_type.length > 0,
      );

      TestValidator.predicate(
        "violation actor_id is non-empty string",
        typeof violation.actor_id === "string" && violation.actor_id.length > 0,
      );

      // created_at should be within the requested time window.
      const createdTs = new Date(violation.created_at).getTime();
      TestValidator.predicate(
        "violation created_at is on or after createdFrom",
        createdTs >= fromTs,
      );
      TestValidator.predicate(
        "violation created_at is on or before createdTo",
        createdTs <= toTs,
      );
    }
  }

  // 6. Perform a broader search (no ruleCodes filter, wider time window)
  const broaderFrom = new Date(now.getTime() - oneDayMs * 7).toISOString();
  const broaderTo = new Date(now.getTime() + oneDayMs * 7).toISOString();

  const broadFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "created_at",
    sortOrder: "desc",
    ruleCodes: undefined,
    excludeRuleCodes: undefined,
    entityTypes: undefined,
    entityIds: undefined,
    minSeverity: undefined,
    maxSeverity: undefined,
    status: undefined,
    decisionOutcomes: undefined,
    createdFrom: broaderFrom,
    createdTo: broaderTo,
    updatedFrom: undefined,
    updatedTo: undefined,
    search: undefined,
  } satisfies IShoppingMallFraudRuleViolation.IRequest;

  const broadResult: IPageIShoppingMallFraudRuleViolation.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.fraudViolations.index(
      connection,
      { body: broadFilterBody },
    );
  typia.assert(broadResult);

  const broadPage: IPage.IPagination = broadResult.pagination;

  TestValidator.predicate(
    "broad search pagination.limit should be positive",
    broadPage.limit > 0,
  );

  TestValidator.predicate(
    "broad search pagination.current non-negative",
    broadPage.current >= 0,
  );

  TestValidator.predicate(
    "broad search pagination.pages non-negative",
    broadPage.pages >= 0,
  );

  if (broadPage.pages > 0) {
    TestValidator.predicate(
      "broad search current page index should be within pages range",
      broadPage.current < broadPage.pages,
    );
  }

  // If both result sets have records, broad search should have at least as many total records as narrow search.
  if (narrowPage.records > 0 && broadPage.records > 0) {
    TestValidator.predicate(
      "broad search records should be >= narrow search records when filters are relaxed",
      broadPage.records >= narrowPage.records,
    );
  }
}
