import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityOverview";
import type { IShoppingMallActorSecurityOverviewPerActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityOverviewPerActorType";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate the admin actor security overview aggregation.
 *
 * Business goal: Ensure that when an admin has created actor security events,
 * the `/shoppingMall/admin/actors/securityOverview` endpoint returns a
 * structurally valid aggregated overview whose high-level invariants are
 * consistent with the DTO definitions. The scenario originally mentions time
 * window and actorType filters, but the current SDK exposes no filterable
 * parameters for this endpoint, so the test focuses on basic aggregation
 * coherence instead.
 *
 * Test flow:
 *
 * 1. Register an admin using POST /auth/admin/join to obtain an authenticated
 *    admin connection.
 * 2. Using that admin connection, create several IShoppingMallActorSecurityEvent
 *    records through POST /shoppingMall/admin/actorSecurityEvents with
 *    different `actor_type` and `event_type` values to simulate heterogeneous
 *    security activity.
 * 3. Call GET /shoppingMall/admin/actors/securityOverview.
 * 4. Validate the returned IShoppingMallActorSecurityOverview via typia.assert to
 *    guarantee DTO-level correctness.
 * 5. Perform additional business-level assertions using TestValidator:
 *
 *    - `totalSecurityEventCount` must be a non-negative integer.
 *    - `perActorType` must be an array; for each
 *         IShoppingMallActorSecurityOverviewPerActorType entry, ensure all
 *         count fields are non-negative integers.
 *    - When the platform reports a positive `totalSecurityEventCount`, there should
 *         be at least one per-actor-type slice whose sum of the recent* counts
 *         is greater than zero, indicating that the overview is not obviously
 *         contradictory.
 *
 * No assumptions are made about exact mapping from individual
 * IShoppingMallActorSecurityEvent rows to per-actor-type counters, since the
 * overview may implement business-specific logic (e.g., filtering by recent
 * window or event types). The test therefore validates only invariants that
 * must hold regardless of those internal rules.
 */
export async function test_api_admin_security_overview_time_window_and_filters(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
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

  // 2. Create multiple actor security events as the admin
  const actorTypes = ["customer", "seller"] as const;
  const eventTypes = [
    "LOGIN_FAILED",
    "LOGIN_SUCCEEDED",
    "PASSWORD_RESET_REQUESTED",
  ] as const;

  const createEvent = async (actorType: (typeof actorTypes)[number]) => {
    const eventBody = {
      actor_type: actorType,
      event_type: RandomGenerator.pick(eventTypes),
      ip: RandomGenerator.mobile(),
      user_agent: RandomGenerator.paragraph({ sentences: 1 }),
      metadata: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallActorSecurityEvent.ICreate;

    const created: IShoppingMallActorSecurityEvent =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        { body: eventBody },
      );
    typia.assert(created);
    return created;
  };

  // Create several events per actor type to seed the overview
  const createdEvents: IShoppingMallActorSecurityEvent[] = [];
  for (const actorType of actorTypes) {
    const perTypeEvents = await ArrayUtil.asyncRepeat(3, async () =>
      createEvent(actorType),
    );
    createdEvents.push(...perTypeEvents);
  }

  // Sanity check: we have created some events
  await TestValidator.predicate(
    "createdEvents length > 0",
    () => createdEvents.length > 0,
  );

  // 3. Call the security overview endpoint (no filters available in SDK)
  const overview: IShoppingMallActorSecurityOverview =
    await api.functional.shoppingMall.admin.actors.securityOverview.at(
      connection,
    );
  typia.assert(overview);

  // 4. Basic structural invariants
  TestValidator.predicate(
    "totalSecurityEventCount is non-negative",
    overview.totalSecurityEventCount >= 0,
  );

  // Ensure perActorType is an array; typia.assert already confirms structure,
  // but we add a semantic check on lengths and counts.
  TestValidator.predicate(
    "perActorType is an array",
    Array.isArray(overview.perActorType),
  );

  // 5. Validate each per-actor-type slice counts are non-negative
  for (const slice of overview.perActorType) {
    typia.assert<IShoppingMallActorSecurityOverviewPerActorType>(slice);

    TestValidator.predicate(
      `recentFailedLoginCount non-negative for actorType ${slice.actorType}`,
      slice.recentFailedLoginCount >= 0,
    );
    TestValidator.predicate(
      `recentSuccessfulLoginCount non-negative for actorType ${slice.actorType}`,
      slice.recentSuccessfulLoginCount >= 0,
    );
    TestValidator.predicate(
      `recentPasswordResetCount non-negative for actorType ${slice.actorType}`,
      slice.recentPasswordResetCount >= 0,
    );
    TestValidator.predicate(
      `activeRiskFlagCount non-negative for actorType ${slice.actorType}`,
      slice.activeRiskFlagCount >= 0,
    );
  }

  // 6. Coherence check between totalSecurityEventCount and per-actor-type sums
  const sumOfRecentCounts = overview.perActorType.reduce(
    (acc, slice) => {
      const subtotal =
        slice.recentFailedLoginCount +
        slice.recentSuccessfulLoginCount +
        slice.recentPasswordResetCount;
      return acc + subtotal;
    },
    0 as number & tags.Type<"int32">,
  );

  // If overview reports any security events, at least one per-actor-type entry
  // should show some recent activity in its counters. We don't enforce equality
  // between these numbers because internal logic may filter or window events.
  if (overview.totalSecurityEventCount > 0) {
    TestValidator.predicate(
      "when totalSecurityEventCount > 0, some perActorType slice reports non-zero recent counts",
      sumOfRecentCounts > 0,
    );
  }
}
