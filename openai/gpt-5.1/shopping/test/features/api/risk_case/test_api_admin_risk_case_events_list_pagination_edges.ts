import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskCaseEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskCaseEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallRiskCaseEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseEvent";

export async function test_api_admin_risk_case_events_list_pagination_edges(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a risk case that will own the events
  const riskCaseCode = RandomGenerator.alphaNumeric(12);
  const riskCaseBody = {
    case_code: riskCaseCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    severity: "high",
    primary_subject_type: null,
    primary_subject_id: null,
    primary_subject_display: null,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBody,
    });
  typia.assert(riskCase);

  // 3. Create more events than a small page size (e.g., 15 when limit=10)
  const totalEvents = 15;
  const createdEvents: IShoppingMallRiskCaseEvent[] = [];

  for (let i = 0; i < totalEvents; i++) {
    const eventBody = {
      event_type: i % 2 === 0 ? "note_added" : "status_changed",
      from_status: i % 2 === 0 ? null : "open",
      to_status: i % 2 === 0 ? null : "under_review",
      description: `event-${i}-${RandomGenerator.paragraph({ sentences: 2 })}`,
      related_entity_type: null,
      related_entity_id: null,
    } satisfies IShoppingMallRiskCaseEvent.ICreate;

    const event: IShoppingMallRiskCaseEvent =
      await api.functional.shoppingMall.admin.riskCases.events.create(
        connection,
        {
          riskCaseCode,
          body: eventBody,
        },
      );
    typia.assert(event);
    createdEvents.push(event);
  }

  // Helper to sort created events by created_at descending/ascending if we
  // want to compare order. However, since we don't know server-side default
  // sorting beyond documentation (likely created_at desc by default when
  // sort_direction is null), we only use counts and metadata as hard
  // assertions.

  const limit = 10;

  // 4. Fetch first page (page=1, limit=10)
  const firstPageRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    event_type: null,
    from_created_at: null,
    to_created_at: null,
    admin_id: null,
    sort_direction: null,
  } satisfies IShoppingMallRiskCaseEvent.IRequest;

  const firstPage: IPageIShoppingMallRiskCaseEvent.ISummary =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode,
      body: firstPageRequest,
    });
  typia.assert(firstPage);

  // Basic pagination metadata checks for first page
  const firstPagePagination = firstPage.pagination;
  TestValidator.equals(
    "first page current should be 1",
    firstPagePagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should equal requested limit",
    firstPagePagination.limit,
    limit,
  );
  TestValidator.predicate(
    "first page records should be at least totalEvents (== 15)",
    firstPagePagination.records >= totalEvents,
  );
  TestValidator.equals(
    "first page pages should be 2 when totalEvents=15 and limit=10",
    firstPagePagination.pages,
    2,
  );

  // Data slice length
  TestValidator.equals(
    "first page data length should equal limit (10)",
    firstPage.data.length,
    limit,
  );

  // 5. Fetch second page (page=2, limit=10)
  const secondPageRequest = {
    page: 2 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    event_type: null,
    from_created_at: null,
    to_created_at: null,
    admin_id: null,
    sort_direction: null,
  } satisfies IShoppingMallRiskCaseEvent.IRequest;

  const secondPage: IPageIShoppingMallRiskCaseEvent.ISummary =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode,
      body: secondPageRequest,
    });
  typia.assert(secondPage);

  const secondPagePagination = secondPage.pagination;
  TestValidator.equals(
    "second page current should be 2",
    secondPagePagination.current,
    2,
  );
  TestValidator.equals(
    "second page pages should remain 2",
    secondPagePagination.pages,
    firstPagePagination.pages,
  );
  TestValidator.equals(
    "second page records should match first page records",
    secondPagePagination.records,
    firstPagePagination.records,
  );

  const expectedRemaining = totalEvents - limit;
  TestValidator.equals(
    "second page data length should be remaining events (5)",
    secondPage.data.length,
    expectedRemaining,
  );

  // 6. Fetch a page beyond the last page (page=3 for 2 pages total)
  const beyondPageRequest = {
    page: 3 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    event_type: null,
    from_created_at: null,
    to_created_at: null,
    admin_id: null,
    sort_direction: null,
  } satisfies IShoppingMallRiskCaseEvent.IRequest;

  const beyondPage: IPageIShoppingMallRiskCaseEvent.ISummary =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode,
      body: beyondPageRequest,
    });
  typia.assert(beyondPage);

  const beyondPagination = beyondPage.pagination;
  TestValidator.equals(
    "beyond page current should reflect requested page (3)",
    beyondPagination.current,
    3,
  );
  TestValidator.equals(
    "beyond page pages should still equal 2",
    beyondPagination.pages,
    firstPagePagination.pages,
  );
  TestValidator.equals(
    "beyond page records should match first page records",
    beyondPagination.records,
    firstPagePagination.records,
  );
  TestValidator.equals(
    "beyond page data should be empty when requesting page > pages",
    beyondPage.data.length,
    0,
  );

  // 7. Validate that reversing sort_direction does not change counts and pages
  const descPageRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    event_type: null,
    from_created_at: null,
    to_created_at: null,
    admin_id: null,
    sort_direction: "desc",
  } satisfies IShoppingMallRiskCaseEvent.IRequest;

  const ascPageRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    event_type: null,
    from_created_at: null,
    to_created_at: null,
    admin_id: null,
    sort_direction: "asc",
  } satisfies IShoppingMallRiskCaseEvent.IRequest;

  const descPage: IPageIShoppingMallRiskCaseEvent.ISummary =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode,
      body: descPageRequest,
    });
  typia.assert(descPage);

  const ascPage: IPageIShoppingMallRiskCaseEvent.ISummary =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode,
      body: ascPageRequest,
    });
  typia.assert(ascPage);

  TestValidator.equals(
    "desc sort pagination records equal base records",
    descPage.pagination.records,
    firstPagePagination.records,
  );
  TestValidator.equals(
    "asc sort pagination records equal base records",
    ascPage.pagination.records,
    firstPagePagination.records,
  );
  TestValidator.equals(
    "desc sort pagination pages equal base pages",
    descPage.pagination.pages,
    firstPagePagination.pages,
  );
  TestValidator.equals(
    "asc sort pagination pages equal base pages",
    ascPage.pagination.pages,
    firstPagePagination.pages,
  );
}
