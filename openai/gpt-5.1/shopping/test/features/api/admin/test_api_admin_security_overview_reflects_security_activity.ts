import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityOverview";
import type { IShoppingMallActorSecurityOverviewPerActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityOverviewPerActorType";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_security_overview_reflects_security_activity(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Baseline security overview snapshot
  const baselineOverview: IShoppingMallActorSecurityOverview =
    await api.functional.shoppingMall.admin.actors.securityOverview.at(
      connection,
    );
  typia.assert(baselineOverview);

  const baselineByActorType: IShoppingMallActorSecurityOverviewPerActorType[] =
    baselineOverview.perActorType;

  // Choose an actor_type we will use for events and flags
  const targetActorType = "customer";

  const baselineEntry:
    | IShoppingMallActorSecurityOverviewPerActorType
    | undefined = baselineByActorType.find(
    (entry) => entry.actorType === targetActorType,
  );

  const baselineFailedLoginCount: number =
    baselineEntry?.recentFailedLoginCount ?? 0;
  const baselineActiveRiskFlagCount: number =
    baselineEntry?.activeRiskFlagCount ?? 0;
  const baselineTotalSecurityEventCount: number =
    baselineOverview.totalSecurityEventCount;

  // 3. Create a security event for the target actor type
  const securityEventBody = {
    actor_type: targetActorType,
    event_type: "LOGIN_FAILED",
    ip: null,
    user_agent: null,
    metadata: null,
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      { body: securityEventBody },
    );
  typia.assert(createdEvent);

  TestValidator.equals(
    "created security event actor_type matches request",
    createdEvent.actor_type,
    securityEventBody.actor_type,
  );
  TestValidator.equals(
    "created security event event_type matches request",
    createdEvent.event_type,
    securityEventBody.event_type,
  );

  // 4. Create an account risk flag for the same actor type
  const riskFlagBody = {
    actor_type: targetActorType,
    code: "SUSPICIOUS_ACTIVITY",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    severity: "high",
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const createdRiskFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      { body: riskFlagBody },
    );
  typia.assert(createdRiskFlag);

  TestValidator.equals(
    "created risk flag actor_type matches request",
    createdRiskFlag.actor_type,
    riskFlagBody.actor_type,
  );

  // 5. Updated security overview snapshot
  const updatedOverview: IShoppingMallActorSecurityOverview =
    await api.functional.shoppingMall.admin.actors.securityOverview.at(
      connection,
    );
  typia.assert(updatedOverview);

  const updatedByActorType: IShoppingMallActorSecurityOverviewPerActorType[] =
    updatedOverview.perActorType;

  // Ensure all counts are non-negative
  updatedByActorType.forEach((entry) => {
    TestValidator.predicate(
      "recentFailedLoginCount is non-negative",
      entry.recentFailedLoginCount >= 0,
    );
    TestValidator.predicate(
      "recentSuccessfulLoginCount is non-negative",
      entry.recentSuccessfulLoginCount >= 0,
    );
    TestValidator.predicate(
      "recentPasswordResetCount is non-negative",
      entry.recentPasswordResetCount >= 0,
    );
    TestValidator.predicate(
      "activeRiskFlagCount is non-negative",
      entry.activeRiskFlagCount >= 0,
    );
  });

  // Capture actorType sets for stability checks
  const baselineActorTypes = new Set(
    baselineByActorType.map((e) => e.actorType),
  );
  const updatedActorTypes = new Set(updatedByActorType.map((e) => e.actorType));

  // Updated actor types must at least include all baseline types
  baselineActorTypes.forEach((actorType) => {
    TestValidator.predicate(
      "updated actorType set includes all baseline actorTypes",
      updatedActorTypes.has(actorType),
    );
  });

  // Updated must contain the target actor type
  TestValidator.predicate(
    "updated overview contains target actorType",
    updatedActorTypes.has(targetActorType),
  );

  const updatedEntry:
    | IShoppingMallActorSecurityOverviewPerActorType
    | undefined = updatedByActorType.find(
    (entry) => entry.actorType === targetActorType,
  );

  TestValidator.predicate(
    "updated entry for target actorType exists",
    updatedEntry !== undefined,
  );

  if (updatedEntry !== undefined) {
    TestValidator.predicate(
      "recentFailedLoginCount has not decreased for target actorType",
      updatedEntry.recentFailedLoginCount >= baselineFailedLoginCount,
    );

    if (baselineFailedLoginCount === 0) {
      TestValidator.predicate(
        "recentFailedLoginCount is at least 1 after creating a LOGIN_FAILED event when baseline was 0",
        updatedEntry.recentFailedLoginCount >= 1,
      );
    }

    TestValidator.predicate(
      "activeRiskFlagCount has not decreased for target actorType",
      updatedEntry.activeRiskFlagCount >= baselineActiveRiskFlagCount,
    );

    // Backend may or may not aggregate risk flags into activeRiskFlagCount,
    // so we only require non-decrease, which is already ensured above.
  }

  // totalSecurityEventCount should not decrease and should increase
  TestValidator.predicate(
    "totalSecurityEventCount has not decreased",
    updatedOverview.totalSecurityEventCount >= baselineTotalSecurityEventCount,
  );
  TestValidator.predicate(
    "totalSecurityEventCount is greater than baseline after creating at least one security event",
    updatedOverview.totalSecurityEventCount > baselineTotalSecurityEventCount,
  );
}
