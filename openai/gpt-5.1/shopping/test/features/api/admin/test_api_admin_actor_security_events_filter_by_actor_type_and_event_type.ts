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

export async function test_api_admin_actor_security_events_filter_by_actor_type_and_event_type(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain an authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // keep IP undefined to let backend derive it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed actor security events with different combinations
  const targetCustomerEventsCount = 3;
  const targetSellerEventsCount = 2;

  const customerLoginFailedEvents: IShoppingMallActorSecurityEvent[] = [];
  const sellerAccountLockedEvents: IShoppingMallActorSecurityEvent[] = [];
  const noiseEvents: IShoppingMallActorSecurityEvent[] = [];

  // 2-1. Create customer LOGIN_FAILED events
  for (let i = 0; i < targetCustomerEventsCount; i++) {
    const created =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: {
            actor_type: "customer",
            event_type: "LOGIN_FAILED",
            ip: null,
            user_agent: null,
            metadata: null,
          } satisfies IShoppingMallActorSecurityEvent.ICreate,
        },
      );
    typia.assert(created);
    customerLoginFailedEvents.push(created);
  }

  // 2-2. Create seller ACCOUNT_LOCKED events
  for (let i = 0; i < targetSellerEventsCount; i++) {
    const created =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: {
            actor_type: "seller",
            event_type: "ACCOUNT_LOCKED",
            ip: null,
            user_agent: null,
            metadata: null,
          } satisfies IShoppingMallActorSecurityEvent.ICreate,
        },
      );
    typia.assert(created);
    sellerAccountLockedEvents.push(created);
  }

  // 2-3. Create some noise events with other combinations
  const noiseCombinations: Array<{
    actor_type: string;
    event_type: string;
  }> = [
    { actor_type: "customer", event_type: "ACCOUNT_LOCKED" },
    { actor_type: "seller", event_type: "LOGIN_FAILED" },
    { actor_type: "admin", event_type: "LOGIN_FAILED" },
  ];

  for (const combo of noiseCombinations) {
    const created =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: {
            actor_type: combo.actor_type,
            event_type: combo.event_type,
            ip: null,
            user_agent: null,
            metadata: null,
          } satisfies IShoppingMallActorSecurityEvent.ICreate,
        },
      );
    typia.assert(created);
    noiseEvents.push(created);
  }

  // 3. Filter for customer + LOGIN_FAILED
  const customerFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 100 as number & tags.Type<"int32">,
    actor_type: "customer",
    event_type: "LOGIN_FAILED",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const customerPage: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      {
        body: customerFilterBody,
      },
    );
  typia.assert(customerPage);

  // 4. Validate that only the expected events are returned
  const customerData = customerPage.data;

  TestValidator.equals(
    "customer LOGIN_FAILED event count matches seeded count",
    customerData.length,
    targetCustomerEventsCount,
  );

  for (const event of customerData) {
    TestValidator.equals(
      "filtered event actor_type is customer",
      event.actor_type,
      "customer",
    );
    TestValidator.equals(
      "filtered event event_type is LOGIN_FAILED",
      event.event_type,
      "LOGIN_FAILED",
    );
  }

  // Ensure none of the seller ACCOUNT_LOCKED or noise events are present by id
  const forbiddenIds = [
    ...sellerAccountLockedEvents.map((e) => e.id),
    ...noiseEvents.map((e) => e.id),
  ];

  for (const event of customerData) {
    TestValidator.predicate(
      "customer filter must not contain seller or noise events",
      forbiddenIds.includes(event.id) === false,
    );
  }

  // 5. Optionally repeat for seller + ACCOUNT_LOCKED
  const sellerFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 100 as number & tags.Type<"int32">,
    actor_type: "seller",
    event_type: "ACCOUNT_LOCKED",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const sellerPage: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      {
        body: sellerFilterBody,
      },
    );
  typia.assert(sellerPage);

  const sellerData = sellerPage.data;

  TestValidator.equals(
    "seller ACCOUNT_LOCKED event count matches seeded count",
    sellerData.length,
    targetSellerEventsCount,
  );

  for (const event of sellerData) {
    TestValidator.equals(
      "filtered event actor_type is seller",
      event.actor_type,
      "seller",
    );
    TestValidator.equals(
      "filtered event event_type is ACCOUNT_LOCKED",
      event.event_type,
      "ACCOUNT_LOCKED",
    );
  }

  const forbiddenCustomerAndNoiseIds = [
    ...customerLoginFailedEvents.map((e) => e.id),
    ...noiseEvents.map((e) => e.id),
  ];

  for (const event of sellerData) {
    TestValidator.predicate(
      "seller filter must not contain customer or noise events",
      forbiddenCustomerAndNoiseIds.includes(event.id) === false,
    );
  }
}
