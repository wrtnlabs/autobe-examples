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

export async function test_api_admin_actor_security_events_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized context
  const joinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Seed actor security events: a mix of admin and non-admin actor_type
  const adminEventTypes = [
    "LOGIN_FAILED",
    "PASSWORD_RESET_REQUESTED",
    "SESSION_REVOKED",
  ] as const;
  const otherActorTypes = ["customer", "seller"] as const;

  const createdAdminEvents: IShoppingMallActorSecurityEvent[] = [];
  const createdOtherEvents: IShoppingMallActorSecurityEvent[] = [];

  // Create several admin-type events
  for (const eventType of adminEventTypes) {
    const createBody = {
      actor_type: "admin",
      event_type: eventType,
      ip: Math.random() < 0.5 ? "192.168.0.1" : null,
      user_agent:
        Math.random() < 0.5
          ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
          : null,
      metadata: undefined,
    } satisfies IShoppingMallActorSecurityEvent.ICreate;

    const created: IShoppingMallActorSecurityEvent =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
    createdAdminEvents.push(created);
  }

  // Create some non-admin events to ensure they are not returned for admin A
  for (const actorType of otherActorTypes) {
    const createBody = {
      actor_type: actorType,
      event_type: "LOGIN_FAILED",
      ip: null,
      user_agent: null,
      metadata: undefined,
    } satisfies IShoppingMallActorSecurityEvent.ICreate;

    const created: IShoppingMallActorSecurityEvent =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
    createdOtherEvents.push(created);
  }

  // 3. Invoke the admin-scoped search endpoint for this admin
  const pageLimit = createdAdminEvents.length + 10;

  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: pageLimit as number & tags.Type<"int32">,
    actor_type: "admin",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const page: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.admins.actorSecurityEvents.index(
      connection,
      {
        adminId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;
  const summaries: IShoppingMallActorSecurityEvent.ISummary[] = page.data;

  // 4. Validate pagination basics
  TestValidator.equals(
    "current page should be 1",
    pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "limit should equal requested pageLimit",
    pagination.limit,
    pageLimit as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "records should be >= number of returned summaries",
    pagination.records >= summaries.length,
  );
  TestValidator.predicate("pages should be at least 1", pagination.pages >= 1);

  // 5. Build lookup maps for verification
  const adminEventMap = new Map<string, IShoppingMallActorSecurityEvent>(
    createdAdminEvents.map((e) => [e.id, e]),
  );
  const otherEventIds = new Set<string>(createdOtherEvents.map((e) => e.id));

  // 6. Verify that each summary is an admin event we created and matches key fields
  for (const summary of summaries) {
    typia.assert<IShoppingMallActorSecurityEvent.ISummary>(summary);

    TestValidator.equals(
      "summary actor_type should be admin",
      summary.actor_type,
      "admin",
    );

    const created = adminEventMap.get(summary.id);
    TestValidator.predicate(
      "summary id should correspond to one of created admin events",
      created !== undefined,
    );
    if (!created) continue;

    TestValidator.equals(
      "event_type in summary should match created event_type",
      summary.event_type,
      created.event_type,
    );

    TestValidator.predicate(
      "created_at in summary should be a non-empty string",
      typeof summary.created_at === "string" && summary.created_at.length > 0,
    );

    if (created.ip === null || created.ip === undefined) {
      TestValidator.predicate(
        "summary ip should be null or undefined when created ip was null/undefined",
        summary.ip === null || summary.ip === undefined,
      );
    } else {
      TestValidator.equals(
        "summary ip should match created ip when provided",
        summary.ip ?? null,
        created.ip,
      );
    }

    if (created.user_agent === null || created.user_agent === undefined) {
      TestValidator.predicate(
        "summary user_agent should be null or undefined when created user_agent was null/undefined",
        summary.user_agent === null || summary.user_agent === undefined,
      );
    } else {
      TestValidator.equals(
        "summary user_agent should match created user_agent when provided",
        summary.user_agent ?? null,
        created.user_agent,
      );
    }
  }

  // 7. Ensure that no non-admin events are present in the summaries
  for (const summary of summaries) {
    TestValidator.predicate(
      "summary should not include ids of non-admin events",
      !otherEventIds.has(summary.id),
    );
  }
}
