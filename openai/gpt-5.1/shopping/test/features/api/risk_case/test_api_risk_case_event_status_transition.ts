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

export async function test_api_risk_case_event_status_transition(
  connection: api.IConnection,
) {
  // 1. Admin join and authentication context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    href: "https://admin.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a risk case with initial status "open"
  const caseCode = `RC-${RandomGenerator.alphaNumeric(12)}`;
  const initialStatus = "open";
  const initialSeverity = "high";

  const riskCaseCreateBody = {
    case_code: caseCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: initialStatus,
    severity: initialSeverity,
  } satisfies IShoppingMallRiskCase.ICreate;

  const createdCase = await api.functional.shoppingMall.admin.riskCases.create(
    connection,
    {
      body: riskCaseCreateBody,
    },
  );
  typia.assert<IShoppingMallRiskCase>(createdCase);

  TestValidator.equals(
    "created case should reflect requested case_code",
    createdCase.case_code,
    caseCode,
  );
  TestValidator.equals(
    "created case should reflect requested status",
    createdCase.status,
    initialStatus,
  );
  TestValidator.equals(
    "created case should reflect requested severity",
    createdCase.severity,
    initialSeverity,
  );

  // 3. Append a status-changed event from "open" to "under_review"
  const nextStatus = "under_review";

  const eventCreateBody = {
    event_type: "status_changed",
    from_status: initialStatus,
    to_status: nextStatus,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallRiskCaseEvent.ICreate;

  const createdEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: caseCode,
        body: eventCreateBody,
      },
    );
  typia.assert<IShoppingMallRiskCaseEvent>(createdEvent);

  TestValidator.equals(
    "created event should be status_changed",
    createdEvent.event_type,
    "status_changed",
  );
  TestValidator.equals(
    "created event from_status should match initial status",
    createdEvent.from_status,
    initialStatus,
  );
  TestValidator.equals(
    "created event to_status should match next status",
    createdEvent.to_status,
    nextStatus,
  );

  TestValidator.predicate(
    "created event must have non-empty created_at",
    createdEvent.created_at.length > 0,
  );

  // 4. Re-fetch the risk case detail and verify status has transitioned
  const reloadedCase = await api.functional.shoppingMall.admin.riskCases.at(
    connection,
    {
      riskCaseCode: caseCode,
    },
  );
  typia.assert<IShoppingMallRiskCase>(reloadedCase);

  TestValidator.equals(
    "risk case status should be updated to next status after event",
    reloadedCase.status,
    nextStatus,
  );

  // 5. List risk case events and ensure our status_changed event exists
  const eventsPage =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode: caseCode,
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 10 as number & tags.Type<"int32">,
        event_type: "status_changed",
      } satisfies IShoppingMallRiskCaseEvent.IRequest,
    });
  typia.assert<IPageIShoppingMallRiskCaseEvent.ISummary>(eventsPage);

  const events = eventsPage.data;

  TestValidator.predicate(
    "events listing should contain at least one status_changed event",
    events.length > 0,
  );

  const matchedEvent = events.find((ev) => ev.id === createdEvent.id);

  TestValidator.predicate(
    "events listing should contain the created status_changed event",
    matchedEvent !== undefined,
  );

  if (matchedEvent !== undefined) {
    TestValidator.equals(
      "matched listed event should have correct from_status",
      matchedEvent.from_status,
      initialStatus,
    );
    TestValidator.equals(
      "matched listed event should have correct to_status",
      matchedEvent.to_status,
      nextStatus,
    );
    TestValidator.equals(
      "matched listed event should have event_type status_changed",
      matchedEvent.event_type,
      "status_changed",
    );
  }
}
