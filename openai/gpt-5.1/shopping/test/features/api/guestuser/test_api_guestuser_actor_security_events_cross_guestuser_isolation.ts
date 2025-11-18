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
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Verify that guest-user scoped actor security event search does not leak
 * events across different guest users.
 *
 * Business objective: Ensure that the admin endpoint PATCH
 * /shoppingMall/admin/guestUsers/{guestUserId}/actorSecurityEvents returns only
 * security events associated with the specified guest user and never includes
 * events that belong to another guest user, even when metadata such as
 * event_type, ip, or user_agent is identical.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join and keep using that connection as
 *    an admin actor when calling admin-only endpoints.
 * 2. Join guest user G1 and G2 via POST /auth/guestUser/join, storing their ids.
 *    These calls temporarily change the connection token, so we will re-join as
 *    an admin afterwards.
 * 3. Re-establish admin authentication by calling /auth/admin/join again so that
 *    subsequent privileged operations run under an admin token.
 * 4. Create multiple actor security events using POST
 *    /shoppingMall/admin/actorSecurityEvents, all with actor_type =
 *    "guestuser". From the test perspective, some are considered G1-related and
 *    some G2-related. We intentionally re-use event_type and ip values across
 *    both groups to prove that isolation is not simply based on those fields.
 * 5. Call PATCH /shoppingMall/admin/guestUsers/{guestUserId}/actorSecurityEvents
 *    for G1 with a broad IShoppingMallActorSecurityEvent.IRequest filter (page,
 *    limit, actor_type only). Assert that:
 *
 *    - Response conforms to IPageIShoppingMallActorSecurityEvent.ISummary.
 *    - All returned summaries have actor_type === "guestuser".
 *    - None of the summaries’ ids match any of the explicitly created G2 events.
 * 6. Repeat step 5 for G2 and assert that none of G1’s explicitly created event
 *    ids appear.
 * 7. This confirms cross-guest isolation at least for the control events: each
 *    guest’s scoped search excludes the other guest’s known events, even under
 *    overlapping metadata, while remaining tolerant to other background data.
 */
export async function test_api_guestuser_actor_security_events_cross_guestuser_isolation(
  connection: api.IConnection,
) {
  // 1. Register an admin; store the authorized payload mainly to ensure
  // type correctness. The SDK will attach the admin token to the connection.
  const adminJoinInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two guest users G1 and G2 via guestUser.join. These calls switch
  // the Authorization token on the connection to the guest user context.
  const guest1: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: typia.random<IShoppingMallGuestUser.IJoin>(),
    });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(guest1);

  const guest2: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: typia.random<IShoppingMallGuestUser.IJoin>(),
    });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(guest2);

  // 3. Re-establish admin authentication so subsequent operations are executed
  // as an admin again. We can create another admin; any valid admin token is
  // sufficient for this test.
  const adminJoinInput2 = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput2,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized2);

  // 4. Create multiple actor security events from the admin context. The
  // IShoppingMallActorSecurityEvent.ICreate DTO has no explicit guestUserId
  // linkage, so we cannot bind events to a particular guest from the test.
  // Instead, we create two small sets of events and later verify that the
  // G1-scoped query does not include the events we treat as the G2 set, and
  // vice versa. We re-use event_type and ip values across sets to ensure
  // isolation is not trivially based on those filters.
  const sharedEventTypeA = "LOGIN_FAILED";
  const sharedEventTypeB = "ACCOUNT_LOCKED";
  const sharedIp = "192.0.2.10"; // documentation-reserved example IP
  const sharedUserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/1.0";

  const makeEventBody = (eventType: string, variant: number) =>
    ({
      actor_type: "guestuser",
      event_type: eventType,
      ip: sharedIp,
      user_agent: sharedUserAgent,
      metadata: `guest-event-variant-${variant}`,
    }) satisfies IShoppingMallActorSecurityEvent.ICreate;

  const g1Events: IShoppingMallActorSecurityEvent[] = [];
  const g2Events: IShoppingMallActorSecurityEvent[] = [];

  const g1EventBodies: IShoppingMallActorSecurityEvent.ICreate[] = [
    makeEventBody(sharedEventTypeA, 1),
    makeEventBody(sharedEventTypeB, 2),
  ];
  const g2EventBodies: IShoppingMallActorSecurityEvent.ICreate[] = [
    makeEventBody(sharedEventTypeA, 3),
    makeEventBody(sharedEventTypeB, 4),
  ];

  for (const body of g1EventBodies) {
    const created: IShoppingMallActorSecurityEvent =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
    g1Events.push(created);
  }

  for (const body of g2EventBodies) {
    const created: IShoppingMallActorSecurityEvent =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
    g2Events.push(created);
  }

  const g1Ids = g1Events.map((e) => e.id);
  const g2Ids = g2Events.map((e) => e.id);

  // 5. Query actor security events scoped by guestUserId = guest1.id and ensure
  // that none of the explicitly created G2 events appear in the results.
  const requestForGuest1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    actor_type: "guestuser",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const pageForGuest1: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.actorSecurityEvents.index(
      connection,
      {
        guestUserId: guest1.id,
        body: requestForGuest1,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(pageForGuest1);

  // All events in the page should be for actor_type "guestuser" when we filter
  // that way.
  await TestValidator.predicate(
    "all guest1-scoped events must have actor_type 'guestuser'",
    async () =>
      pageForGuest1.data.every((summary) => summary.actor_type === "guestuser"),
  );

  const guest1PageIds = pageForGuest1.data.map((s) => s.id);
  const leakToGuest1 = guest1PageIds.some((id) => g2Ids.includes(id));
  TestValidator.predicate(
    "guest1-scoped search must not contain G2 control events",
    leakToGuest1 === false,
  );

  // 6. Repeat for guest2: query and ensure none of the G1 control events leak
  // into the guest2-scoped results.
  const requestForGuest2 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    actor_type: "guestuser",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const pageForGuest2: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.actorSecurityEvents.index(
      connection,
      {
        guestUserId: guest2.id,
        body: requestForGuest2,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(pageForGuest2);

  await TestValidator.predicate(
    "all guest2-scoped events must have actor_type 'guestuser'",
    async () =>
      pageForGuest2.data.every((summary) => summary.actor_type === "guestuser"),
  );

  const guest2PageIds = pageForGuest2.data.map((s) => s.id);
  const leakToGuest2 = guest2PageIds.some((id) => g1Ids.includes(id));
  TestValidator.predicate(
    "guest2-scoped search must not contain G1 control events",
    leakToGuest2 === false,
  );
}
