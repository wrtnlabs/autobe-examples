import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate per-admin isolation when querying actor security events.
 *
 * Business goal: Ensure that when an administrator searches actor security
 * events via PATCH /shoppingMall/admin/admins/{adminId}/actorSecurityEvents,
 * the backend returns only security events linked to the specified admin and
 * does not leak events that belong to other admins.
 *
 * Scenario covered by this test:
 *
 * 1. Register two independent administrator accounts, A and B, using POST
 *    /auth/admin/join. Each join call returns an IShoppingMallAdmin.IAuthorized
 *    payload containing admin identity and authorization tokens. The SDK
 *    automatically wires the access token into the connection headers.
 * 2. While authenticated as admin A (after the first join), create a small set of
 *    actor security events using POST
 *    /shoppingMall/admin/actorSecurityEvents.create. These events are tagged
 *    with actor_type = "admin" and event_type values that clearly identify them
 *    as ADMIN_A_* from the test perspective.
 * 3. Join again as admin B, which switches the authentication context in the
 *    shared connection to admin B via the SDK’s header management.
 * 4. While authenticated as admin B, create another set of actor security events
 *    with actor_type = "admin" and event_type values clearly identifiable as
 *    ADMIN_B_*.
 * 5. Still as admin B, call PATCH
 *    /shoppingMall/admin/admins/{adminId}/actorSecurityEvents using
 *    api.functional.shoppingMall.admin.admins.actorSecurityEvents.index with:
 *
 *    - AdminId = adminB.id (the second admin’s identifier),
 *    - A broad IShoppingMallActorSecurityEvent.IRequest filter that sets page and
 *         limit to cover the newly created events and specifies actor_type =
 *         "admin".
 * 6. Validate that the returned page:
 *
 *    - Is a well-formed IPageIShoppingMallActorSecurityEvent.ISummary (verified via
 *         typia.assert).
 *    - Contains only events with actor_type === "admin".
 *    - Contains no event_type values from the ADMIN_A_* set created for admin A.
 *    - Contains at least one event_type value from the ADMIN_B_* set created for
 *         admin B, ensuring our test data is visible.
 *
 * This test does not rely on explicit HTTP status code checks or
 * negative-access semantics for querying other admins’ histories. It instead
 * focuses purely on the positive isolation guarantee: when querying with `{
 * adminId: currentAdmin.id }`, the result set must not mix in events logically
 * associated with another admin.
 */
export async function test_api_admin_actor_security_events_search_cross_admin_isolation(
  connection: api.IConnection,
) {
  // 1. Register admin A
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminA);

  const adminAId: string & tags.Format<"uuid"> = adminA.id;

  // 2. As admin A, create a set of ADMIN_A_* security events
  const adminAEventTypes = [
    "ADMIN_A_LOGIN_FAILED",
    "ADMIN_A_ACCOUNT_LOCKED",
    "ADMIN_A_PASSWORD_RESET_REQUESTED",
  ] as const;

  const adminAEvents: IShoppingMallActorSecurityEvent[] = [];
  for (const eventType of adminAEventTypes) {
    const created: IShoppingMallActorSecurityEvent =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: {
            actor_type: "admin",
            event_type: eventType,
            ip: "192.0.2.1",
            user_agent: "AdminA-Agent",
            metadata: JSON.stringify({
              adminId: adminAId,
              marker: "ADMIN_A",
              eventType,
            }),
          } satisfies IShoppingMallActorSecurityEvent.ICreate,
        },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
    adminAEvents.push(created);
  }

  // 3. Register admin B (this call overwrites Authorization header to admin B)
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);

  const adminBId: string & tags.Format<"uuid"> = adminB.id;

  // 4. As admin B, create a set of ADMIN_B_* security events
  const adminBEventTypes = [
    "ADMIN_B_LOGIN_FAILED",
    "ADMIN_B_SESSION_REVOKED",
    "ADMIN_B_CONFIG_CHANGED",
  ] as const;

  const adminBEvents: IShoppingMallActorSecurityEvent[] = [];
  for (const eventType of adminBEventTypes) {
    const created: IShoppingMallActorSecurityEvent =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: {
            actor_type: "admin",
            event_type: eventType,
            ip: "198.51.100.2",
            user_agent: "AdminB-Agent",
            metadata: JSON.stringify({
              adminId: adminBId,
              marker: "ADMIN_B",
              eventType,
            }),
          } satisfies IShoppingMallActorSecurityEvent.ICreate,
        },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
    adminBEvents.push(created);
  }

  // 5. As admin B, query security events scoped to admin B
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    actor_type: "admin",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const page: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.admins.actorSecurityEvents.index(
      connection,
      {
        adminId: adminBId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(page);

  // 6. Validate pagination basics
  const pagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);
  TestValidator.predicate(
    "pagination.limit should be >= number of returned events",
    () => pagination.limit >= page.data.length,
  );

  // Build quick lookup sets for event_type patterns
  const adminAEventTypeSet = new Set<string>(
    adminAEventTypes as readonly string[],
  );
  const adminBEventTypeSet = new Set<string>(
    adminBEventTypes as readonly string[],
  );

  // 7. Validate that all returned events are admin-type and none match ADMIN_A_* patterns
  for (const summary of page.data) {
    typia.assert<IShoppingMallActorSecurityEvent.ISummary>(summary);

    TestValidator.equals(
      "each event actor_type must be 'admin'",
      summary.actor_type,
      "admin",
    );

    TestValidator.predicate(
      "no ADMIN_A_* events should appear when querying admin B",
      () => !adminAEventTypeSet.has(summary.event_type),
    );
  }

  // 8. Ensure at least one of our ADMIN_B_* events is visible in the result
  const resultEventTypes = new Set<string>(page.data.map((s) => s.event_type));
  const hasAdminBEvent = Array.from(adminBEventTypeSet).some((t) =>
    resultEventTypes.has(t),
  );

  TestValidator.predicate(
    "at least one ADMIN_B_* event created in this test should appear in admin B's scoped search",
    hasAdminBEvent,
  );
}
