import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFraudRuleAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleAnalytics";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_fraud_rule_analytics_authorization_required(
  connection: api.IConnection,
) {
  // 1. Prepare a valid fraud rule analytics request body
  const now: Date = new Date();
  const fromDate: Date = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const requestBody = {
    from: fromDate.toISOString(),
    to: now.toISOString(),
    timeGranularity: "hour",
    includePerRuleBreakdown: true,
    includeTimeSeries: true,
    includeSeverityBreakdown: true,
    includeRuleCategoryBreakdown: true,
  } satisfies IShoppingMallFraudRuleAnalytics.IRequest;

  // 2. Anonymous access must be forbidden
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous access to fraud analytics is forbidden",
    async () => {
      await api.functional.shoppingMall.platformAdmin.analytics.fraudRules.index(
        unauthConnection,
        {
          body: requestBody,
        },
      );
    },
  );

  // 3. Join as platform admin (creates account and authenticates connection)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 4. Authorized platform admin can access fraud rule analytics
  const analytics: IShoppingMallFraudRuleAnalytics.IResponse =
    await api.functional.shoppingMall.platformAdmin.analytics.fraudRules.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallFraudRuleAnalytics.IResponse>(analytics);

  // Basic echo validations for core request fields
  TestValidator.equals(
    "analytics.from echoes request from",
    analytics.from,
    requestBody.from,
  );
  TestValidator.equals(
    "analytics.to echoes request to",
    analytics.to,
    requestBody.to,
  );
  TestValidator.equals(
    "analytics.timeGranularity echoes request timeGranularity",
    analytics.timeGranularity,
    requestBody.timeGranularity,
  );

  // Business-level sanity checks
  await TestValidator.predicate(
    "totalViolations is non-negative",
    async () => analytics.totalViolations >= 0,
  );
  await TestValidator.predicate(
    "uniqueRulesTriggered is non-negative",
    async () => analytics.uniqueRulesTriggered >= 0,
  );
}
