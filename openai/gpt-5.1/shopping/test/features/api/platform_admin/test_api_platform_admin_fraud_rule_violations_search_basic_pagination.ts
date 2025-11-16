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
 * Validate basic fraud rule violation search pagination for platform admins.
 *
 * Business goal
 *
 * - Ensure a platform administrator can search fraud rule violations using PATCH
 *   /shoppingMall/platformAdmin/analytics/fraudViolations, with reasonable
 *   pagination and sorting semantics, after proper authentication and fraud
 *   rule definition setup.
 *
 * Scenario outline
 *
 * 1. Register and authenticate a platform admin using POST
 *    /auth/platformAdmin/join.
 *
 *    - Build an IShoppingMallPlatformAdminJoin.IRequest with realistic email, name
 *         and password plus href/referrer URIs.
 *    - Call api.functional.auth.platformAdmin.join and assert the
 *         IShoppingMallPlatformAdmin.IAuthorized result with typia.assert.
 *    - Rely on the SDK to attach the access token to the connection (do not
 *         manipulate connection.headers manually).
 * 2. As this authenticated admin, create at least one fraud rule definition.
 *
 *    - Build an IShoppingMallFraudRuleDefinition.ICreate payload with:
 *
 *         - RuleCode: stable random-ish string
 *         - Name: human-friendly name
 *         - Optional description
 *         - Scope: some domain string like "order" or "payment"
 *         - Severity: e.g. "high"
 *         - RuleExpression: some non-empty serialized expression string
 *         - IsEnabled: true
 *    - Call api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create
 *         and typia.assert the IShoppingMallFraudRuleDefinition response.
 * 3. Search fraud rule violations with pagination and basic filters.
 *
 *    - IShoppingMallFraudRuleViolation.IRequest.page is 1-based Minimum<1>, while
 *         IPage.IPagination.current is 0-based Minimum<0>. The test reconciles
 *         this by:
 *
 *         - Sending page = 1 and limit = 20 in the request.
 *         - Expecting pagination.current === 0 and pagination.limit === 20 in the
 *                   IPageIShoppingMallFraudRuleViolation.ISummary response.
 *    - Build a request body with, at minimum:
 *
 *         - Page: 1
 *         - Limit: 20
 *         - SortBy: "occurred_at" (free-form string, backend validates)
 *         - SortOrder: "desc"
 *         - RuleCodes: [createdRule.ruleCode] (hint filter by our rule where possible,
 *                   but do not assume violations actually exist for it).
 *    - Call api.functional.shoppingMall.platformAdmin.analytics.fraudViolations.index
 *         and typia.assert the IPageIShoppingMallFraudRuleViolation.ISummary
 *         response.
 * 4. Validate pagination metadata invariants regardless of data size.
 *
 *    - Let p = output.pagination, d = output.data.
 *    - Assert with TestValidator:
 *
 *         - P.current === 0 (because we requested page=1, first logical page).
 *         - P.limit === 20.
 *         - P.records >= 0 and p.pages >= 0.
 *         - If p.records === 0, then:
 *
 *                       (-P.pages === 0 - D.length) === 0;
 *         - Else (records > 0):
 *
 *                           - P.pages >= 1
 *                           - D.length <= p.limit
 *                           - Pages === Math.ceil(records / max(limit, 1)).
 * 5. Validate violation summary structure.
 *
 *    - For each summary s in d:
 *
 *         - Use typia.assert on the pageResult to guarantee type correctness.
 *         - Check that id, actor_type, actor_id, severity, occurred_at, created_at are
 *                   non-empty strings.
 *         - Check that rule_definition is present and that rule_definition.rule_code is a
 *                   non-empty string.
 *         - Do **not** assume that any summaries necessarily reference the newly created
 *                   ruleCode because the test has no way to guarantee the
 *                   existence of such violations.
 * 6. Validate sort ordering by occurred_at when multiple results are present.
 *
 *    - If d.length >= 2 and sortOrder === "desc":
 *
 *         - Iterate adjacent pairs and assert that s[i].occurred_at >= s[i+1].occurred_at
 *                   lexicographically, since they are ISO8601 date-time strings
 *                   and lexicographic comparison matches chronological order.
 * 7. Do not validate HTTP status codes or type error scenarios.
 *
 *    - We rely on SDK/typia for type correctness and treat any thrown error as a
 *         test failure.
 */
export async function test_api_platform_admin_fraud_rule_violations_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to get authorized session
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
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
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a fraud rule definition as this admin
  const ruleBody = {
    ruleCode: `RULE_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: "order",
    severity: "high",
    ruleExpression: JSON.stringify({
      field: "order.totalAmount",
      operator: ">",
      threshold: 100000,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const rule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: ruleBody,
      },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(rule);

  // 3. Search fraud rule violations with page=1 (1-based) and limit=20
  const requestBody = {
    page: 1,
    limit: 20,
    sortBy: "occurred_at",
    sortOrder: "desc",
    ruleCodes: [rule.ruleCode],
  } satisfies IShoppingMallFraudRuleViolation.IRequest;

  const pageResult: IPageIShoppingMallFraudRuleViolation.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.fraudViolations.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallFraudRuleViolation.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 4. Validate pagination metadata invariants
  TestValidator.equals(
    "pagination current index should be 0 for first page",
    pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be non-negative",
    pagination.pages >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when no records, pages must be 0",
      pagination.pages,
      0,
    );
    TestValidator.equals(
      "when no records, data array must be empty",
      data.length,
      0,
    );
    return;
  }

  // records > 0
  TestValidator.predicate(
    "when there are records, pages must be at least 1",
    pagination.pages >= 1,
  );
  TestValidator.predicate(
    "page data length must not exceed limit",
    data.length <= pagination.limit,
  );

  const expectedPages = Math.ceil(
    pagination.records / (pagination.limit === 0 ? 1 : pagination.limit),
  );
  TestValidator.equals(
    "pages must equal ceil(records / max(limit,1))",
    pagination.pages,
    expectedPages,
  );

  // 5. Validate violation summary structure
  for (const summary of data) {
    TestValidator.predicate(
      "summary id should be non-empty",
      summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary actor_type should be non-empty",
      summary.actor_type.length > 0,
    );
    TestValidator.predicate(
      "summary actor_id should be non-empty",
      summary.actor_id.length > 0,
    );
    TestValidator.predicate(
      "summary severity should be non-empty",
      summary.severity.length > 0,
    );
    TestValidator.predicate(
      "summary occurred_at should be non-empty",
      summary.occurred_at.length > 0,
    );
    TestValidator.predicate(
      "summary created_at should be non-empty",
      summary.created_at.length > 0,
    );
    TestValidator.predicate(
      "summary must have a rule_definition with non-empty rule_code",
      summary.rule_definition.rule_code.length > 0,
    );
  }

  // 6. Validate sort ordering by occurred_at when multiple results exist
  if (data.length >= 2) {
    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i];
      const next = data[i + 1];
      TestValidator.predicate(
        "violations should be sorted by occurred_at in non-increasing order when sortOrder is desc",
        current.occurred_at >= next.occurred_at,
      );
    }
  }
}
