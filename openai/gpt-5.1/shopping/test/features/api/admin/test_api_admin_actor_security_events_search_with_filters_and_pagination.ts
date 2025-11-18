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

export async function test_api_admin_actor_security_events_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register admin A via /auth/admin/join to obtain an authorized admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. As admin A, create a diverse set of actor security events.
  // We'll create events with different actor_type and event_type combinations.
  const actorTypes = ["admin", "customer"] as const;
  const eventTypes = ["LOGIN_FAILED", "ACCOUNT_LOCKED"] as const;

  const createdEvents: IShoppingMallActorSecurityEvent[] = [];

  // Ensure we have enough matching events for pagination: create 8 events total,
  // with at least 5 events matching (actor_type="admin", event_type="LOGIN_FAILED").
  for (let i = 0; i < 8; i++) {
    const actor_type = i < 5 ? "admin" : RandomGenerator.pick(actorTypes);
    const event_type =
      i < 5 ? "LOGIN_FAILED" : RandomGenerator.pick(eventTypes);

    const createBody = {
      actor_type,
      event_type,
      ip: RandomGenerator.alphabets(10),
      user_agent: RandomGenerator.paragraph({ sentences: 2 }),
      metadata: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IShoppingMallActorSecurityEvent.ICreate;

    const created =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
    createdEvents.push(created);
  }

  // 3. Prepare local filtering and sorting based on returned created_at values.
  // Focus on actor_type="admin" and event_type="LOGIN_FAILED".
  const targetActorType = "admin";
  const targetEventType = "LOGIN_FAILED";

  const matchingAll = createdEvents.filter((ev) => {
    return (
      ev.actor_type === targetActorType && ev.event_type === targetEventType
    );
  });

  // Sort by created_at descending (newest first).
  const matchingSorted = [...matchingAll].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  // Ensure we have at least 3 matching events for pagination tests.
  TestValidator.predicate(
    "at least three matching events must exist",
    matchingSorted.length >= 3,
  );

  // Choose a window covering all matching events (for simplicity) and then
  // rely on pagination (page & limit) to split pages.
  const from_created_at = matchingSorted[matchingSorted.length - 1].created_at;
  const to_created_at = matchingSorted[0].created_at;

  // Pagination settings: limit=2 to force multiple pages when records >= 3.
  const limit = 2;

  // 4. Call PATCH index for page 1.
  const page1Body = {
    page: 1,
    limit,
    actor_type: targetActorType,
    event_type: targetEventType,
    from_created_at,
    to_created_at,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const page1 =
    await api.functional.shoppingMall.admin.admins.actorSecurityEvents.index(
      connection,
      {
        adminId,
        body: page1Body,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // 5. Validate pagination metadata for page 1.
  TestValidator.equals(
    "page1 current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "page1 limit should match requested limit",
    pagination1.limit,
    limit,
  );

  const expectedRecords = matchingSorted.length;
  TestValidator.equals(
    "total records should equal count of locally filtered events",
    pagination1.records,
    expectedRecords,
  );

  const expectedPages = Math.ceil(expectedRecords / limit);
  TestValidator.equals(
    "total pages should equal ceil(records/limit)",
    pagination1.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "page1 data length must be <= limit",
    data1.length <= limit,
  );

  // 6. Validate data contents for page 1: filter conditions and ordering.
  for (let i = 0; i < data1.length; i++) {
    const ev = data1[i];
    TestValidator.equals(
      `page1 event ${i} actor_type must be admin`,
      ev.actor_type,
      targetActorType,
    );
    TestValidator.equals(
      `page1 event ${i} event_type must be LOGIN_FAILED`,
      ev.event_type,
      targetEventType,
    );
    TestValidator.predicate(
      `page1 event ${i} created_at should be within range`,
      ev.created_at >= from_created_at && ev.created_at <= to_created_at,
    );
  }

  // Ordering: non-increasing by created_at.
  for (let i = 1; i < data1.length; i++) {
    TestValidator.predicate(
      `page1 events must be ordered by created_at desc at index ${i}`,
      data1[i - 1].created_at >= data1[i].created_at,
    );
  }

  // 7. Request page 2 with the same filters when more records exist.
  if (expectedRecords > limit) {
    const page2Body = {
      page: 2,
      limit,
      actor_type: targetActorType,
      event_type: targetEventType,
      from_created_at,
      to_created_at,
      order_by: "created_at",
      order_direction: "desc",
    } satisfies IShoppingMallActorSecurityEvent.IRequest;

    const page2 =
      await api.functional.shoppingMall.admin.admins.actorSecurityEvents.index(
        connection,
        {
          adminId,
          body: page2Body,
        },
      );
    typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(page2);

    const pagination2 = page2.pagination;
    const data2 = page2.data;

    TestValidator.equals(
      "page2 current page should be 2",
      pagination2.current,
      2,
    );
    TestValidator.equals(
      "page2 limit should match requested limit",
      pagination2.limit,
      limit,
    );

    TestValidator.equals(
      "page2 total records should equal expectedRecords",
      pagination2.records,
      expectedRecords,
    );

    TestValidator.equals(
      "page2 total pages should equal expectedPages",
      pagination2.pages,
      expectedPages,
    );

    TestValidator.predicate(
      "page2 data length must be <= limit",
      data2.length <= limit,
    );

    // Validate filter conditions and ordering for page 2.
    for (let i = 0; i < data2.length; i++) {
      const ev = data2[i];
      TestValidator.equals(
        `page2 event ${i} actor_type must be admin`,
        ev.actor_type,
        targetActorType,
      );
      TestValidator.equals(
        `page2 event ${i} event_type must be LOGIN_FAILED`,
        ev.event_type,
        targetEventType,
      );
      TestValidator.predicate(
        `page2 event ${i} created_at should be within range`,
        ev.created_at >= from_created_at && ev.created_at <= to_created_at,
      );
    }

    for (let i = 1; i < data2.length; i++) {
      TestValidator.predicate(
        `page2 events must be ordered by created_at desc at index ${i}`,
        data2[i - 1].created_at >= data2[i].created_at,
      );
    }

    // 8. Cross-page deduplication and completeness check for first two pages.
    const combined = [...data1, ...data2];

    // Local expectation: first up to 2*limit items from matchingSorted.
    const expectedCombined = matchingSorted
      .slice(0, 2 * limit)
      .map((ev) => ev.id)
      .sort();

    const combinedIds = combined.map((ev) => ev.id).sort();

    TestValidator.equals(
      "combined page1+page2 ids should match locally sorted ids slice",
      combinedIds,
      expectedCombined,
    );

    // Ensure no duplicate ids across pages.
    const uniqueIds = Array.from(new Set(combinedIds));
    TestValidator.equals(
      "combined ids should have no duplicates",
      uniqueIds.length,
      combinedIds.length,
    );
  }
}
