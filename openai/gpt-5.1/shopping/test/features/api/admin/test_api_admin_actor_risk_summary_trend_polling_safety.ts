import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorRiskSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorRiskSummary";
import type { IShoppingMallActorRiskSummaryPerActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorRiskSummaryPerActorType";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_actor_risk_summary_trend_polling_safety(
  connection: api.IConnection,
) {
  /**
   * Validate safe repeated polling of the admin actor risk summary dashboard.
   *
   * This test ensures that an administrator can join once and then repeatedly
   * poll the consolidated risk summary endpoint used by dashboards,
   * `/shoppingMall/admin/actors/riskSummary`, without encountering
   * authorization issues or schema drift.
   *
   * High-level flow:
   *
   * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
   *    admin session (SDK manages tokens in `connection`).
   * 2. Call GET /shoppingMall/admin/actors/riskSummary several times in succession
   *    to simulate dashboard polling.
   * 3. For each response, validate that it conforms to
   *    `IShoppingMallActorRiskSummary` and that basic invariants hold, such as
   *    non-negative integer totals and stable per-actor-type structure.
   * 4. Compare responses across calls to ensure the shape is stable and there are
   *    no pathological anomalies, while not over-constraining dynamic business
   *    values.
   */

  // 1. Admin join: create an authenticated admin session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional ip can be omitted; href and referrer must be valid URIs.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // Sanity-check basic token structure to ensure auth context is usable.
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. Poll the risk summary endpoint multiple times using the same connection.
  const pollingCount = 5;
  const summaries: IShoppingMallActorRiskSummary[] = [];

  for (let i = 0; i < pollingCount; ++i) {
    const summary: IShoppingMallActorRiskSummary =
      await api.functional.shoppingMall.admin.actors.riskSummary.at(connection);
    // Strict structural/type validation.
    typia.assert<IShoppingMallActorRiskSummary>(summary);

    // Basic invariants for totals.
    TestValidator.predicate(
      `poll#${i}: totalActiveFlags is non-negative int32`,
      summary.totalActiveFlags >= 0,
    );
    TestValidator.predicate(
      `poll#${i}: totalOpenRiskCases is non-negative int32`,
      summary.totalOpenRiskCases >= 0,
    );

    // Validate perActorType slice structure and non-negative counts.
    for (let j = 0; j < summary.perActorType.length; ++j) {
      const per: IShoppingMallActorRiskSummaryPerActorType =
        summary.perActorType[j];
      typia.assert<IShoppingMallActorRiskSummaryPerActorType>(per);

      TestValidator.predicate(
        `poll#${i}[${j}]: actorCount is non-negative`,
        per.actorCount >= 0,
      );
      TestValidator.predicate(
        `poll#${i}[${j}]: activeFlagCount is non-negative`,
        per.activeFlagCount >= 0,
      );
      TestValidator.predicate(
        `poll#${i}[${j}]: openRiskCaseCount is non-negative`,
        per.openRiskCaseCount >= 0,
      );
      TestValidator.predicate(
        `poll#${i}[${j}]: criticalFlagCount is non-negative`,
        per.criticalFlagCount >= 0,
      );
    }

    summaries.push(summary);
  }

  // 3. Cross-call structural stability checks.
  // Ensure that perActorType shape (actorType keys set) remains stable across calls
  // for dashboards relying on consistent series per actor type.
  if (summaries.length >= 2) {
    const base = summaries[0];
    const baseActorTypes = base.perActorType.map((p) => p.actorType).sort();

    for (let i = 1; i < summaries.length; ++i) {
      const current = summaries[i];
      const currentActorTypes = current.perActorType
        .map((p) => p.actorType)
        .sort();

      TestValidator.equals(
        `poll#${i}: actorType set stability`,
        currentActorTypes,
        baseActorTypes,
      );
    }

    // Optional sanity: totals should not become negative or wildly inconsistent
    // relative to each other; we only check basic monotonic non-negativity and
    // that numbers stay within a reasonable 32-bit range, leaving exact
    // business evolution unconstrained.
    for (let i = 0; i < summaries.length; ++i) {
      const s = summaries[i];
      TestValidator.predicate(
        `poll#${i}: totalActiveFlags within int32 domain`,
        Number.isInteger(s.totalActiveFlags) &&
          Math.abs(s.totalActiveFlags) <= 2_147_483_647,
      );
      TestValidator.predicate(
        `poll#${i}: totalOpenRiskCases within int32 domain`,
        Number.isInteger(s.totalOpenRiskCases) &&
          Math.abs(s.totalOpenRiskCases) <= 2_147_483_647,
      );
    }
  }
}
