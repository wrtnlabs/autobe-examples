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

export async function test_api_admin_actor_security_events_filter_by_created_at_range(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create three security events and capture their created_at values
  const createdEvents: IShoppingMallActorSecurityEvent[] = [];

  for (let i = 0; i < 3; i += 1) {
    const createBody = {
      actor_type: "admin",
      event_type: "TEST_EVENT",
      ip: null,
      user_agent: null,
      metadata: null,
    } satisfies IShoppingMallActorSecurityEvent.ICreate;

    const created: IShoppingMallActorSecurityEvent =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert(created);
    createdEvents.push(created);
  }

  TestValidator.equals("exactly three events created", createdEvents.length, 3);

  // 3. Determine middle event by creation time
  const sortedByCreatedAt: IShoppingMallActorSecurityEvent[] = [
    ...createdEvents,
  ].sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
  );

  const earliest = sortedByCreatedAt[0];
  const middle = sortedByCreatedAt[1];
  const latest = sortedByCreatedAt[2];

  // Use exact created_at of middle event as both from and to, so we only match events
  // that share this exact timestamp (inclusive range collapse)
  const fromCreatedAt: string & tags.Format<"date-time"> = middle.created_at;
  const toCreatedAt: string & tags.Format<"date-time"> = middle.created_at;

  // 4. Call search endpoint with time window filter
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    from_created_at: fromCreatedAt,
    to_created_at: toCreatedAt,
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const page: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  const { pagination, data } = page;

  // 5. Validate pagination metadata and filtering behavior
  TestValidator.predicate(
    "pagination records must be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination limit must be at least 0",
    pagination.limit >= 0,
  );

  TestValidator.predicate(
    "data length must be between 0 and limit",
    data.length <= pagination.limit,
  );

  // There should be at least one event in the window (the middle event)
  TestValidator.predicate(
    "at least one event returned within time window",
    data.length >= 1,
  );

  // All returned events must have created_at within [fromCreatedAt, toCreatedAt]
  for (const summary of data) {
    TestValidator.predicate(
      "event created_at not earlier than fromCreatedAt",
      summary.created_at >= fromCreatedAt,
    );
    TestValidator.predicate(
      "event created_at not later than toCreatedAt",
      summary.created_at <= toCreatedAt,
    );
  }

  // Ensure middle event is included when its created_at matches the filter
  const containsMiddle = data.some((summary) => summary.id === middle.id);
  TestValidator.predicate(
    "result set contains the middle event by id",
    containsMiddle,
  );

  // If earliest or latest have different created_at than middle, they must not appear
  if (earliest.created_at !== middle.created_at) {
    const containsEarliest = data.some((summary) => summary.id === earliest.id);
    TestValidator.predicate(
      "earliest event excluded when its created_at differs from middle",
      containsEarliest === false,
    );
  }

  if (latest.created_at !== middle.created_at) {
    const containsLatest = data.some((summary) => summary.id === latest.id);
    TestValidator.predicate(
      "latest event excluded when its created_at differs from middle",
      containsLatest === false,
    );
  }
}
