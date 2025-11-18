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

export async function test_api_admin_actor_security_events_search_time_range_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  const adminId = adminAuth.id;

  // Helper to create an admin-typed security event
  const createEvent = async (
    eventType: string,
  ): Promise<IShoppingMallActorSecurityEvent> => {
    const body = {
      actor_type: "admin",
      event_type: eventType,
      ip: null,
      user_agent: null,
      metadata: null,
    } satisfies IShoppingMallActorSecurityEvent.ICreate;

    const created =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body,
        },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
    return created;
  };

  // 2. Create three events with slightly different timestamps by spacing them out
  const eventA = await createEvent("TEST_EVENT_A");
  await new Promise((resolve) => setTimeout(resolve, 30));
  const eventB = await createEvent("TEST_EVENT_B");
  await new Promise((resolve) => setTimeout(resolve, 30));
  const eventC = await createEvent("TEST_EVENT_C");

  const events = [eventA, eventB, eventC];

  // Sort by created_at ascending using ISO 8601 string comparison
  const sorted = [...events].sort((x, y) =>
    x.created_at < y.created_at ? -1 : x.created_at > y.created_at ? 1 : 0,
  );

  const earliest = sorted[0];
  const middle = sorted[1];
  const latest = sorted[2];

  // Sanity: ensure three distinct created_at values
  await TestValidator.predicate(
    "three distinct created_at timestamps",
    async () => {
      return (
        earliest.created_at !== middle.created_at &&
        middle.created_at !== latest.created_at &&
        earliest.created_at !== latest.created_at
      );
    },
  );

  // 3. Closed interval [T0, T1] where T0 == T1 == middle.created_at
  const closedRangeRequest = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 10 satisfies number & tags.Type<"int32">,
    actor_type: "admin",
    event_type: undefined,
    from_created_at: middle.created_at,
    to_created_at: middle.created_at,
    ip: null,
    user_agent: null,
    metadata: null,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const closedRangePage: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.admins.actorSecurityEvents.index(
      connection,
      {
        adminId,
        body: closedRangeRequest,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(closedRangePage);

  TestValidator.equals(
    "closed range returns exactly one event (records)",
    1,
    closedRangePage.pagination.records,
  );

  TestValidator.equals(
    "closed range data length is 1",
    1,
    closedRangePage.data.length,
  );

  const closedEvent = closedRangePage.data[0];
  TestValidator.equals(
    "closed range event id matches middle event",
    middle.id,
    closedEvent.id,
  );

  // 4. Open-ended from_created_at only: >= latest.created_at
  const fromOnlyRequest = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 10 satisfies number & tags.Type<"int32">,
    actor_type: "admin",
    event_type: undefined,
    from_created_at: latest.created_at,
    to_created_at: undefined,
    ip: null,
    user_agent: null,
    metadata: null,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const fromOnlyPage: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.admins.actorSecurityEvents.index(
      connection,
      {
        adminId,
        body: fromOnlyRequest,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(fromOnlyPage);

  TestValidator.equals(
    "from-only range records equals data length",
    fromOnlyPage.data.length,
    fromOnlyPage.pagination.records,
  );

  if (fromOnlyPage.data.length > 0) {
    const fromOnlyFirst = fromOnlyPage.data[0];
    TestValidator.equals(
      "from-only first event created_at is >= latest",
      true,
      fromOnlyFirst.created_at >= latest.created_at,
    );
  }

  // 5. Open-ended to_created_at only: <= earliest.created_at
  const toOnlyRequest = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 10 satisfies number & tags.Type<"int32">,
    actor_type: "admin",
    event_type: undefined,
    from_created_at: undefined,
    to_created_at: earliest.created_at,
    ip: null,
    user_agent: null,
    metadata: null,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const toOnlyPage: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.admins.actorSecurityEvents.index(
      connection,
      {
        adminId,
        body: toOnlyRequest,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(toOnlyPage);

  TestValidator.equals(
    "to-only range records equals data length",
    toOnlyPage.data.length,
    toOnlyPage.pagination.records,
  );

  if (toOnlyPage.data.length > 0) {
    const toOnlyLast = toOnlyPage.data[toOnlyPage.data.length - 1];
    TestValidator.equals(
      "to-only last event created_at is <= earliest",
      true,
      toOnlyLast.created_at <= earliest.created_at,
    );
  }
}
