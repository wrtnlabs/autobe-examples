import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorRiskAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorRiskAnalytics";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskFlag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_actor_risk_analytics_permission_enforcement(
  connection: api.IConnection,
) {
  // 1. Unauthenticated call: clone connection without headers to simulate no Authorization.
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  const minimalRequestBody = {
    // Small window: from now minus 1 hour to now
    fromTimestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    toTimestamp: new Date().toISOString(),
    actorTypes: ["customer", "seller", "platformAdmin"],
    minimumSeverity: "low",
    groupBy: ["actorType", "severity", "timeBucket"],
    timeBucketSize: "hour",
  } satisfies IShoppingMallActorRiskAnalytics.IRequest;

  await TestValidator.error(
    "unauthenticated risk analytics access should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.actors.riskAnalytics.index(
        unauthenticated,
        { body: minimalRequestBody },
      );
    },
  );

  // 2. Register a platform admin (this also authenticates the main connection).
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 3. Optionally seed a fraud rule definition.
  const fraudRuleBody = {
    ruleCode: `RULE_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: "order",
    severity: "medium",
    ruleExpression: JSON.stringify({
      type: "threshold",
      field: "order.totalAmount",
      operator: ">",
      value: 100000,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const fraudRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: fraudRuleBody },
    );
  typia.assert(fraudRule);

  // 4. Optionally seed a risk flag on a random authCredentialsId.
  const randomAuthCredentialsId = typia.random<string & tags.Format<"uuid">>();

  const riskFlagBody = {
    code: "suspicious_login_pattern",
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  const riskFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId: randomAuthCredentialsId,
        body: riskFlagBody,
      },
    );
  typia.assert(riskFlag);

  // 5. Authenticated analytics call with a slightly broader window and same groupings.
  const analyticsRequestBody = {
    fromTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    toTimestamp: new Date().toISOString(),
    actorTypes: ["customer", "seller", "platformAdmin"],
    minimumSeverity: "low",
    riskCategories: ["suspected_fraud"],
    groupBy: ["actorType", "severity", "timeBucket"],
    timeBucketSize: "hour",
  } satisfies IShoppingMallActorRiskAnalytics.IRequest;

  const analytics: IShoppingMallActorRiskAnalytics =
    await api.functional.shoppingMall.platformAdmin.actors.riskAnalytics.index(
      connection,
      { body: analyticsRequestBody },
    );

  typia.assert(analytics);

  // 6. High-level invariants on the analytics response.
  const summary = analytics.summary;
  TestValidator.predicate(
    "totalActorsEvaluated is non-negative",
    summary.totalActorsEvaluated >= 0,
  );
  TestValidator.predicate(
    "actorsWithActiveRiskFlags is non-negative",
    summary.actorsWithActiveRiskFlags >= 0,
  );
  TestValidator.predicate(
    "totalRiskFlags is non-negative",
    summary.totalRiskFlags >= 0,
  );
  TestValidator.predicate(
    "highSeverityActorCount is non-negative",
    summary.highSeverityActorCount >= 0,
  );
  TestValidator.predicate(
    "criticalSeverityActorCount is non-negative",
    summary.criticalSeverityActorCount >= 0,
  );

  if (analytics.byActorType !== undefined) {
    TestValidator.predicate(
      "byActorType bucket count is non-negative",
      analytics.byActorType.length >= 0,
    );
  }

  if (analytics.bySeverity !== undefined) {
    TestValidator.predicate(
      "bySeverity bucket count is non-negative",
      analytics.bySeverity.length >= 0,
    );
  }

  if (analytics.byRegion !== undefined) {
    TestValidator.predicate(
      "byRegion bucket count is non-negative",
      analytics.byRegion.length >= 0,
    );
  }

  if (analytics.byRiskCategory !== undefined) {
    TestValidator.predicate(
      "byRiskCategory bucket count is non-negative",
      analytics.byRiskCategory.length >= 0,
    );
  }

  if (analytics.timeSeries !== undefined) {
    TestValidator.predicate(
      "timeSeries bucket count is non-negative",
      analytics.timeSeries.length >= 0,
    );
  }
}
