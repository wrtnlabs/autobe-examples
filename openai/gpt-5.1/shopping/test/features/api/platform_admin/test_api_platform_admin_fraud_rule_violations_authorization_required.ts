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
 * Verify that fraud violations analytics requires platformAdmin authorization.
 *
 * Business goal
 *
 * - The analytics endpoint that lists fraud rule violations is highly sensitive
 *   and must only be accessible to platform administrators.
 * - This test checks that:
 *
 *   1. An unauthenticated connection cannot access the endpoint.
 *   2. A properly authenticated platformAdmin can access it and receive a
 *        well-typed, paginated response.
 *
 * Scenario
 *
 * 1. Prepare a minimal-but-valid search body for
 *    IShoppingMallFraudRuleViolation.IRequest (page, limit and a simple
 *    createdFrom/createdTo time range) so that the request always passes body
 *    validation regardless of who calls it.
 * 2. Clone the incoming connection into an unauthenticated connection by removing
 *    any Authorization header.
 * 3. Call
 *    api.functional.shoppingMall.platformAdmin.analytics.fraudViolations.index
 *    with the unauthenticated connection and the request body, and assert that
 *    it fails by throwing an error using TestValidator.error. We do not depend
 *    on the exact numeric status code; the presence of an error is sufficient
 *    to prove denial.
 * 4. Using the original connection (which the SDK will manage headers for), call
 *    api.functional.auth.platformAdmin.join with a random but valid
 *    IShoppingMallPlatformAdminJoin.IRequest. This both creates the
 *    platformAdmin actor and configures the Authorization header on the
 *    connection.
 * 5. Optionally create a fraud rule definition via
 *    api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create so
 *    that, in realistic deployments, violations could exist. The test does not
 *    depend on actual violation rows being present; an empty page is still
 *    valid.
 * 6. Call fraudViolations.index again, this time with the authenticated
 *    platformAdmin connection and the same request body, and assert that:
 *
 *    - The call succeeds without throwing.
 *    - The response conforms to IPageIShoppingMallFraudRuleViolation.ISummary via
 *         typia.assert.
 *    - The pagination object has a non-negative current page and records count, and
 *         the data array is defined (which may be empty).
 * 7. The contrast between the unauthenticated failure and the successful
 *    platformAdmin call demonstrates correct role-based access control for this
 *    analytics endpoint.
 */
export async function test_api_platform_admin_fraud_rule_violations_authorization_required(
  connection: api.IConnection,
) {
  // 1. Build a minimal valid fraud violation search request body
  const now = new Date();
  const createdFrom = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdTo = now.toISOString();

  const requestBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>
    >(),
    createdFrom,
    createdTo,
  } satisfies IShoppingMallFraudRuleViolation.IRequest;

  // 2. Create an unauthenticated clone of the connection by wiping headers
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Unauthenticated call must be rejected (we only assert that an error occurs)
  await TestValidator.error(
    "fraudViolations analytics requires authentication",
    async () => {
      await api.functional.shoppingMall.platformAdmin.analytics.fraudViolations.index(
        unauthenticated,
        { body: requestBody },
      );
    },
  );

  // 4. Join as a platform admin (also sets Authorization header internally)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  TestValidator.predicate(
    "platform admin session is active",
    () => admin.isActive === true,
  );

  // 5. Optionally create a fraud rule definition to make the context realistic
  const ruleCreateBody = {
    ruleCode: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: "order",
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    ruleExpression: JSON.stringify({ threshold: 100, field: "orderAmount" }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const fraudRule =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: ruleCreateBody },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(fraudRule);

  // 6. Authenticated platformAdmin call must succeed and return a valid page
  const pageResult =
    await api.functional.shoppingMall.platformAdmin.analytics.fraudViolations.index(
      connection,
      { body: requestBody },
    );

  typia.assert<IPageIShoppingMallFraudRuleViolation.ISummary>(pageResult);

  // Basic pagination sanity checks (business-level, not type-level)
  TestValidator.predicate(
    "pagination current page is non-negative",
    () => pageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    () => pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    () => pageResult.pagination.pages >= 0,
  );

  TestValidator.equals(
    "data array is defined (may be empty)",
    Array.isArray(pageResult.data),
    true,
  );
}
