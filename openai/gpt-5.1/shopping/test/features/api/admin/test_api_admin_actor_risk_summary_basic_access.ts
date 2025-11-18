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
 * Validate that an authenticated admin can access the global actor risk summary
 * dashboard and that the returned metrics are structurally sound and
 * non-negative.
 *
 * ## Business goal
 *
 * This E2E test ensures that the platform-wide risk dashboard endpoint
 * `/shoppingMall/admin/actors/riskSummary` works correctly for a freshly
 * registered administrator:
 *
 * 1. An admin joins the platform via `POST /auth/admin/join`.
 * 2. The SDK automatically stores the issued JWT access token into the connection
 *    so that subsequent calls are authenticated as this admin.
 * 3. The admin calls `GET /shoppingMall/admin/actors/riskSummary`.
 * 4. The response is validated against `IShoppingMallActorRiskSummary` and basic
 *    semantic invariants are checked (non-negative counters, reasonable
 *    relations between totals and per-actor-type slices).
 *
 * This verifies both the authentication precondition and the integrity of the
 * dashboard DTO without depending on any particular underlying data volume.
 * Even if the backing database is empty and everything is zero, the invariants
 * still hold.
 */
export async function test_api_admin_actor_risk_summary_basic_access(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform and obtains an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional and nullable; omit to let the backend derive it.
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. Call the risk summary endpoint as the authenticated admin.
  const summary: IShoppingMallActorRiskSummary =
    await api.functional.shoppingMall.admin.actors.riskSummary.at(connection);
  typia.assert<IShoppingMallActorRiskSummary>(summary);

  // 3. Basic structural and semantic validations on top-level fields.
  TestValidator.predicate(
    "totalActiveFlags is a non-negative integer",
    () =>
      Number.isInteger(summary.totalActiveFlags) &&
      summary.totalActiveFlags >= 0,
  );

  TestValidator.predicate(
    "totalOpenRiskCases is a non-negative integer",
    () =>
      Number.isInteger(summary.totalOpenRiskCases) &&
      summary.totalOpenRiskCases >= 0,
  );

  // 4. perActorType must be an array; typia.assert already guarantees array
  //    typing, but we can perform business-level checks on each entry.
  TestValidator.predicate(
    "perActorType is an array",
    Array.isArray(summary.perActorType),
  );

  for (const item of summary.perActorType) {
    const entry: IShoppingMallActorRiskSummaryPerActorType = item;
    typia.assert<IShoppingMallActorRiskSummaryPerActorType>(entry);

    TestValidator.predicate(
      "actorType is a non-empty string when present",
      typeof entry.actorType === "string" && entry.actorType.length > 0,
    );

    TestValidator.predicate(
      "actorCount is a non-negative integer",
      () => Number.isInteger(entry.actorCount) && entry.actorCount >= 0,
    );

    TestValidator.predicate(
      "activeFlagCount is a non-negative integer",
      () =>
        Number.isInteger(entry.activeFlagCount) && entry.activeFlagCount >= 0,
    );

    TestValidator.predicate(
      "openRiskCaseCount is a non-negative integer",
      () =>
        Number.isInteger(entry.openRiskCaseCount) &&
        entry.openRiskCaseCount >= 0,
    );

    TestValidator.predicate(
      "criticalFlagCount is a non-negative integer",
      () =>
        Number.isInteger(entry.criticalFlagCount) &&
        entry.criticalFlagCount >= 0,
    );

    // Conservative consistency: each slice's active and critical flag counts
    // should not exceed the global totalActiveFlags.
    TestValidator.predicate(
      "per-actor activeFlagCount does not exceed totalActiveFlags",
      () => entry.activeFlagCount <= summary.totalActiveFlags,
    );

    TestValidator.predicate(
      "per-actor criticalFlagCount does not exceed totalActiveFlags",
      () => entry.criticalFlagCount <= summary.totalActiveFlags,
    );
  }

  // 5. If there is at least one per-actor-type entry, ensure at least one
  //    of the totals reflects the presence of risk signals or actors.
  if (summary.perActorType.length > 0) {
    const hasAnyActorsOrFlags = summary.perActorType.some(
      (item) =>
        item.actorCount > 0 ||
        item.activeFlagCount > 0 ||
        item.openRiskCaseCount > 0 ||
        item.criticalFlagCount > 0,
    );

    TestValidator.predicate(
      "when perActorType is non-empty, either there are actors or some flags/cases",
      hasAnyActorsOrFlags ||
        (summary.totalActiveFlags === 0 && summary.totalOpenRiskCases === 0),
    );
  }
}
