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

export async function test_api_admin_risk_case_events_list_basic_timeline(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a new risk case.
  const riskCaseCreateBody = {
    case_code: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    severity: "medium",
    primary_subject_type: "customer",
    primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
    primary_subject_display: RandomGenerator.name(2),
    sla_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IShoppingMallRiskCase.ICreate;

  const createdCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseCreateBody,
    });
  typia.assert(createdCase);

  // 3. Append two timeline events to this risk case.
  const firstEventBody = {
    event_type: "created",
    from_status: null,
    to_status: "open",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    related_entity_type: null,
    related_entity_id: null,
  } satisfies IShoppingMallRiskCaseEvent.ICreate;

  const firstEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: createdCase.case_code,
        body: firstEventBody,
      },
    );
  typia.assert(firstEvent);

  const secondEventBody = {
    event_type: "status_changed",
    from_status: "open",
    to_status: "under_review",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    related_entity_type: null,
    related_entity_id: null,
  } satisfies IShoppingMallRiskCaseEvent.ICreate;

  const secondEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: createdCase.case_code,
        body: secondEventBody,
      },
    );
  typia.assert(secondEvent);

  TestValidator.notEquals(
    "two events must have different IDs",
    firstEvent.id,
    secondEvent.id,
  );

  // 4. List events as a paginated timeline (page=1, limit=10, asc).
  const requestBody = {
    page: 1,
    limit: 10,
    event_type: null,
    from_created_at: null,
    to_created_at: null,
    admin_id: null,
    sort_direction: "asc",
  } satisfies IShoppingMallRiskCaseEvent.IRequest;

  const page: IPageIShoppingMallRiskCaseEvent.ISummary =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode: createdCase.case_code,
      body: requestBody,
    });
  typia.assert(page);

  // 5. Validate pagination meta.
  const pagination = page.pagination;
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals("pagination limit should be 10", pagination.limit, 10);
  TestValidator.predicate(
    "pagination.records should be at least 2",
    pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1",
    pagination.pages >= 1,
  );

  // Ensure there are at least two events in the data array.
  TestValidator.predicate(
    "events data should contain at least two events",
    page.data.length >= 2,
  );

  // Filter events belonging to our risk case by matching risk_case_id.
  const caseEvents = page.data.filter(
    (ev) => ev.risk_case_id === createdCase.id,
  );

  TestValidator.predicate(
    "there should be at least two events for the created risk case",
    caseEvents.length >= 2,
  );

  // Verify that the explicitly created events appear in the case events list
  // with correct linkage and event types.
  const foundFirst = caseEvents.find((ev) => ev.id === firstEvent.id);
  const foundSecond = caseEvents.find((ev) => ev.id === secondEvent.id);

  TestValidator.predicate(
    "timeline should contain the first created event",
    foundFirst !== undefined,
  );
  TestValidator.predicate(
    "timeline should contain the second created event",
    foundSecond !== undefined,
  );

  if (foundFirst !== undefined) {
    TestValidator.equals(
      "first event should link to the created risk case",
      foundFirst.risk_case_id,
      createdCase.id,
    );
    TestValidator.equals(
      "first event type should be 'created'",
      foundFirst.event_type,
      "created",
    );
  }

  if (foundSecond !== undefined) {
    TestValidator.equals(
      "second event should link to the created risk case",
      foundSecond.risk_case_id,
      createdCase.id,
    );
    TestValidator.equals(
      "second event type should be 'status_changed'",
      foundSecond.event_type,
      "status_changed",
    );
  }

  // Verify that events for this case are in chronological order by created_at.
  const sortedCaseEvents = [...caseEvents].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const isCaseNonDecreasing = sortedCaseEvents.every((ev, index, array) => {
    if (index === 0) return true;
    return array[index - 1].created_at <= ev.created_at;
  });
  TestValidator.predicate(
    "case events should be ordered by created_at ascending when sorted",
    isCaseNonDecreasing,
  );

  // Verify that created_at is non-decreasing in the page data according to
  // the requested sort_direction="asc".
  const isPageNonDecreasing = page.data.every((ev, index, array) => {
    if (index === 0) return true;
    return array[index - 1].created_at <= ev.created_at;
  });
  TestValidator.predicate(
    "events should be ordered by created_at ascending across page data",
    isPageNonDecreasing,
  );
}
