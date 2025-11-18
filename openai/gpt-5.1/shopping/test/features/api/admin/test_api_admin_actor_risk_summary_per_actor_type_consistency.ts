import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorRiskSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorRiskSummary";
import type { IShoppingMallActorRiskSummaryPerActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorRiskSummaryPerActorType";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate per-actor-type risk summary consistency against global totals.
 *
 * Business flow:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authorized admin
 *    session.
 * 2. Call GET /shoppingMall/admin/actors/riskSummary as that admin.
 * 3. Assert that the response matches IShoppingMallActorRiskSummary.
 * 4. Ensure that per-actor-type aggregates are numerically consistent with the
 *    overall totals.
 *
 * Verified rules:
 *
 * - Sum of activeFlagCount over all perActorType entries <= totalActiveFlags.
 * - Sum of openRiskCaseCount over all perActorType entries <= totalOpenRiskCases.
 * - For each perActorType item:
 *
 *   - ActorCount, activeFlagCount, openRiskCaseCount, criticalFlagCount are all >=
 *       0.
 *   - CriticalFlagCount <= activeFlagCount.
 */
export async function test_api_admin_actor_risk_summary_per_actor_type_consistency(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorization
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Call risk summary endpoint as authorized admin
  const summary: IShoppingMallActorRiskSummary =
    await api.functional.shoppingMall.admin.actors.riskSummary.at(connection);
  typia.assert(summary);

  const perActorType: IShoppingMallActorRiskSummaryPerActorType[] =
    summary.perActorType;

  // 3. Aggregate sums over per-actor-type entries
  const sumActiveFlags = perActorType.reduce(
    (accumulator, item) => accumulator + item.activeFlagCount,
    0,
  );
  const sumOpenRiskCases = perActorType.reduce(
    (accumulator, item) => accumulator + item.openRiskCaseCount,
    0,
  );

  // 4. Cross-check per-actor-type sums against global totals
  TestValidator.predicate(
    "sum of per-actor-type activeFlagCount must not exceed totalActiveFlags",
    sumActiveFlags <= summary.totalActiveFlags,
  );

  TestValidator.predicate(
    "sum of per-actor-type openRiskCaseCount must not exceed totalOpenRiskCases",
    sumOpenRiskCases <= summary.totalOpenRiskCases,
  );

  // 5. Per-actor-type internal consistency checks
  for (const item of perActorType) {
    TestValidator.predicate(
      `actorCount must be non-negative for actorType=${item.actorType}`,
      item.actorCount >= 0,
    );
    TestValidator.predicate(
      `activeFlagCount must be non-negative for actorType=${item.actorType}`,
      item.activeFlagCount >= 0,
    );
    TestValidator.predicate(
      `openRiskCaseCount must be non-negative for actorType=${item.actorType}`,
      item.openRiskCaseCount >= 0,
    );
    TestValidator.predicate(
      `criticalFlagCount must be non-negative for actorType=${item.actorType}`,
      item.criticalFlagCount >= 0,
    );
    TestValidator.predicate(
      `criticalFlagCount must not exceed activeFlagCount for actorType=${item.actorType}`,
      item.criticalFlagCount <= item.activeFlagCount,
    );
  }
}
