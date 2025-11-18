import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallRiskRuleStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRuleStatistics";

/**
 * Validate that risk rule statistics endpoint strictly requires admin
 * authentication.
 *
 * Business goals and coverage:
 *
 * - Ensure unauthenticated callers cannot access GET
 *   /shoppingMall/admin/statistics/riskRules.
 * - Ensure customer-scoped tokens from /auth/customer/join cannot access the
 *   admin statistics endpoint.
 * - Ensure a valid admin context created via /auth/admin/join can access the
 *   endpoint and receive a well-typed IShoppingMallRiskRuleStatistics payload.
 *
 * Step-by-step scenario:
 *
 * 1. Start from the provided test connection which may or may not be
 *    authenticated.
 * 2. Create an "unauthenticated" clone connection with empty headers to simulate
 *    no Authorization header being sent, but never mutate headers afterward.
 * 3. Call api.functional.shoppingMall.admin.statistics.riskRules.index using this
 *    unauthenticated connection and assert that it fails using
 *    TestValidator.error, without checking specific status codes or error
 *    payload structure.
 * 4. Prepare a fresh connection (or reuse a cloned one) that initially has no
 *    Authorization header.
 * 5. Use api.functional.auth.customer.join with a valid
 *    IShoppingMallCustomerJoin.IRequest body to register a new customer and
 *    implicitly attach a customer JWT access token to that connection.
 * 6. Invoke api.functional.shoppingMall.admin.statistics.riskRules.index on this
 *    customer-authenticated connection and assert via TestValidator.error that
 *    access is denied for customer actors.
 * 7. Finally, on the original test connection, register an admin via
 *    api.functional.auth.admin.join with a valid IShoppingMallAdminJoin.ICreate
 *    body. This should attach an admin Authorization token to the connection
 *    headers via the SDK.
 * 8. With this admin-authenticated connection, call
 *    api.functional.shoppingMall.admin.statistics.riskRules.index and assert
 *    success, using typia.assert<IShoppingMallRiskRuleStatistics>() to validate
 *    the response type.
 * 9. Optionally, add basic business-oriented predicates on aggregate fields (e.g.,
 *    total_rules, active_rules, disabled_rules) to ensure they are non-negative
 *    and consistent, while trusting typia.assert for structural correctness.
 */
export async function test_api_admin_risk_rule_statistics_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection clone with empty headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Unauthenticated access must fail.
  await TestValidator.error("unauthenticated access must fail", async () => {
    await api.functional.shoppingMall.admin.statistics.riskRules.index(
      unauthenticatedConnection,
    );
  });

  // 3. Prepare a separate connection for customer join, also starting unauthenticated.
  const customerConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Customer joins and obtains an authorized customer context.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(customerConnection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 5. Customer-authenticated access must also fail.
  await TestValidator.error(
    "customer token must not access admin risk statistics",
    async () => {
      await api.functional.shoppingMall.admin.statistics.riskRules.index(
        customerConnection,
      );
    },
  );

  // 6. Admin joins using the original test connection, gaining admin-scoped token.
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

  // 7. Admin-authenticated access should succeed.
  const stats: IShoppingMallRiskRuleStatistics =
    await api.functional.shoppingMall.admin.statistics.riskRules.index(
      connection,
    );
  typia.assert(stats);

  // 8. Basic business sanity checks on aggregated counts.
  TestValidator.predicate(
    "total_rules must be non-negative",
    stats.total_rules >= 0,
  );
  TestValidator.predicate(
    "active_rules must be non-negative",
    stats.active_rules >= 0,
  );
  TestValidator.predicate(
    "disabled_rules must be non-negative",
    stats.disabled_rules >= 0,
  );
  TestValidator.predicate(
    "rules_with_recent_cases must be non-negative",
    stats.rules_with_recent_cases >= 0,
  );
  TestValidator.predicate(
    "overrides_active_count must be non-negative",
    stats.overrides_active_count >= 0,
  );
}
