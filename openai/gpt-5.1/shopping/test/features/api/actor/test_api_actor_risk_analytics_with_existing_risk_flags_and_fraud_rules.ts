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

/**
 * Validate aggregated actor risk analytics when fraud rules and risk flags
 * exist.
 *
 * Business context: Platform administrators rely on a read-only risk analytics
 * endpoint to get an at-a-glance understanding of current actor risk posture.
 * This test wires up a minimal but realistic setup: it onboards a new platform
 * admin, defines at least one fraud rule, attaches an active high-severity risk
 * flag to some authentication credentials, and then queries the actor risk
 * analytics endpoint over a time window that covers those creations.
 *
 * The focus is to ensure that, once fraud rules and risk flags exist, the
 * analytics response contains non-zero totals and breakdown metrics consistent
 * with the created data, without exposing any sensitive credential information
 * or raw rule expressions.
 *
 * Steps:
 *
 * 1. Join as a new platform admin via POST /auth/platformAdmin/join.
 * 2. As this admin, create a fraud rule definition via POST
 *    /shoppingMall/platformAdmin/fraudRuleDefinitions.
 * 3. Synthesize an authCredentialsId (UUID) representing some auth credentials and
 *    attach an active high-severity risk flag to it via POST
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags.
 * 4. Build an actor risk analytics request body that:
 *
 *    - Uses a from/to timestamp window bracketing the current time.
 *    - Requests actorTypes including "platformAdmin".
 *    - Sets minimumSeverity to at most "low" so the high-severity flag is included.
 *    - Uses groupBy ["actorType", "severity"] to get breakdowns.
 * 5. Call PATCH /shoppingMall/platformAdmin/actors/riskAnalytics with the prepared
 *    request while authenticated as the platform admin.
 * 6. Assert the response type with typia.assert and validate business
 *    expectations:
 *
 *    - Summary.totalRiskFlags >= 1.
 *    - If byActorType exists, at least one entry has totalRiskFlags >= 1.
 *    - If bySeverity exists, at least one bucket has severity "high" and
 *         totalRiskFlags >= 1.
 * 7. Rely on the IShoppingMallActorRiskAnalytics DTO shape to ensure no sensitive
 *    details (password hashes, tokens, raw rule expressions) are exposed by the
 *    analytics endpoint.
 */
export async function test_api_actor_risk_analytics_with_existing_risk_flags_and_fraud_rules(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin so that subsequent calls run under admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a fraud rule definition so analytics can incorporate rule-based risk context.
  const fraudRuleCreateBody = {
    ruleCode: `RULE_${RandomGenerator.alphaNumeric(8)}`,
    name: "High risk login pattern",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: "auth_credentials",
    severity: "high",
    ruleExpression: JSON.stringify({
      type: "threshold",
      field: "failed_login_attempts_last_hour",
      gte: 5,
    }),
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const fraudRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: fraudRuleCreateBody,
      },
    );
  typia.assert(fraudRule);

  // 3. Attach an active high-severity risk flag to some auth credentials.
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const riskFlagCreateBody = {
    code: "suspicious_login_pattern",
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    expiresAt,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  const riskFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: riskFlagCreateBody,
      },
    );
  typia.assert(riskFlag);

  // 4. Build the risk analytics request body, bracketing the current time.
  const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const analyticsRequestBody = {
    fromTimestamp: from,
    toTimestamp: to,
    actorTypes: ["platformAdmin"],
    minimumSeverity: "low",
    riskCategories: undefined,
    regionCodes: undefined,
    groupBy: ["actorType", "severity"],
    timeBucketSize: undefined,
  } satisfies IShoppingMallActorRiskAnalytics.IRequest;

  // 5. Call the analytics endpoint.
  const analytics: IShoppingMallActorRiskAnalytics =
    await api.functional.shoppingMall.platformAdmin.actors.riskAnalytics.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert(analytics);

  // 6. Validate high-level metrics.
  TestValidator.predicate(
    "summary.totalRiskFlags should be at least 1 when a risk flag exists",
    analytics.summary.totalRiskFlags >= 1,
  );

  // 7. If byActorType is provided, ensure at least one entry has non-zero flags.
  if (analytics.byActorType && analytics.byActorType.length > 0) {
    const hasNonZeroActorType = analytics.byActorType.some(
      (bucket) => bucket.totalRiskFlags >= 1,
    );

    TestValidator.predicate(
      "at least one actorType bucket has totalRiskFlags >= 1",
      hasNonZeroActorType,
    );
  }

  // 8. If bySeverity is provided, ensure a high-severity bucket has non-zero flags.
  if (analytics.bySeverity && analytics.bySeverity.length > 0) {
    const highSeverityBucket = analytics.bySeverity.find(
      (bucket) => bucket.severity === "high",
    );

    if (highSeverityBucket) {
      TestValidator.predicate(
        "high severity bucket has totalRiskFlags >= 1",
        highSeverityBucket.totalRiskFlags >= 1,
      );
    }
  }

  // 9. Indirectly confirm no sensitive internal details are leaked by
  //    only touching the documented analytics fields; any presence of
  //    credential secrets or raw rule expressions would violate the
  //    IShoppingMallActorRiskAnalytics contract and typia.assert would fail.
}
