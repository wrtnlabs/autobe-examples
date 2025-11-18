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

/**
 * Validate that risk case events can link to external related entities and that
 * those links are persisted and exposed correctly via listing.
 *
 * Business workflow:
 *
 * 1. Register an admin via /auth/admin/join to establish an authenticated admin
 *    session.
 * 2. Create a parent risk case via /shoppingMall/admin/riskCases.
 * 3. Create a first risk case event under that case with non-null
 *    related_entity_type/id.
 * 4. List events for the case and verify the created event and its
 *    related_entity_* fields.
 * 5. Create a second event for the same case without related_entity_* to exercise
 *    nullable behavior.
 * 6. Re-list and verify both events, ensuring nullable handling does not break
 *    serialization.
 */
export async function test_api_risk_case_event_with_related_entity_link(
  connection: api.IConnection,
) {
  // 1. Admin join to get authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a parent risk case
  const riskCaseCreateBody = {
    case_code: `RC-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    severity: "high",
    primary_subject_type: "order",
    primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
    primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseCreateBody,
    });
  typia.assert<IShoppingMallRiskCase>(riskCase);
  TestValidator.equals(
    "risk case code should match the created code",
    riskCase.case_code,
    riskCaseCreateBody.case_code,
  );

  // 3. Create first event with related_entity_type/id
  const relatedEntityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const eventCreateBodyWithLink = {
    event_type: "external_signal",
    from_status: null,
    to_status: null,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    related_entity_type: "order",
    related_entity_id: relatedEntityId,
  } satisfies IShoppingMallRiskCaseEvent.ICreate;

  const linkedEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: riskCase.case_code,
        body: eventCreateBodyWithLink,
      },
    );
  typia.assert<IShoppingMallRiskCaseEvent>(linkedEvent);

  // Validate that the event links to the risk case and carries related entity fields
  TestValidator.predicate(
    "event should have a non-empty risk case id",
    typeof linkedEvent.shopping_mall_risk_case_id === "string" &&
      linkedEvent.shopping_mall_risk_case_id.length > 0,
  );
  TestValidator.equals(
    "event related_entity_type should match request",
    linkedEvent.related_entity_type,
    eventCreateBodyWithLink.related_entity_type,
  );
  TestValidator.equals(
    "event related_entity_id should match request",
    linkedEvent.related_entity_id,
    eventCreateBodyWithLink.related_entity_id,
  );

  // 4. List events and ensure the linked event is visible with correct fields
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    event_type: eventCreateBodyWithLink.event_type,
    from_created_at: null,
    to_created_at: null,
    admin_id: null,
    sort_direction: "desc",
  } satisfies IShoppingMallRiskCaseEvent.IRequest;

  const page: IPageIShoppingMallRiskCaseEvent.ISummary =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode: riskCase.case_code,
      body: listRequestBody,
    });
  typia.assert<IPageIShoppingMallRiskCaseEvent.ISummary>(page);

  const matchedSummary = page.data.find(
    (summary) => summary.id === linkedEvent.id,
  );
  TestValidator.predicate(
    "linked event should appear in events index",
    !!matchedSummary,
  );
  if (matchedSummary) {
    TestValidator.equals(
      "summary.related_entity_type matches created event",
      matchedSummary.related_entity_type,
      linkedEvent.related_entity_type,
    );
    TestValidator.equals(
      "summary.related_entity_id matches created event",
      matchedSummary.related_entity_id,
      linkedEvent.related_entity_id,
    );
  }

  // 5. Create a second event with nullable related entity fields
  const eventCreateBodyWithoutLink = {
    event_type: "note_added",
    from_status: riskCase.status,
    to_status: riskCase.status,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    related_entity_type: null,
    related_entity_id: null,
  } satisfies IShoppingMallRiskCaseEvent.ICreate;

  const nullLinkedEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: riskCase.case_code,
        body: eventCreateBodyWithoutLink,
      },
    );
  typia.assert<IShoppingMallRiskCaseEvent>(nullLinkedEvent);

  TestValidator.equals(
    "event without link should have null related_entity_type",
    nullLinkedEvent.related_entity_type,
    eventCreateBodyWithoutLink.related_entity_type,
  );
  TestValidator.equals(
    "event without link should have null related_entity_id",
    nullLinkedEvent.related_entity_id,
    eventCreateBodyWithoutLink.related_entity_id,
  );

  // 6. Re-list without event_type filter to ensure both events are present and correctly shaped
  const secondListRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    event_type: null,
    from_created_at: null,
    to_created_at: null,
    admin_id: null,
    sort_direction: "desc",
  } satisfies IShoppingMallRiskCaseEvent.IRequest;

  const secondPage: IPageIShoppingMallRiskCaseEvent.ISummary =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode: riskCase.case_code,
      body: secondListRequestBody,
    });
  typia.assert<IPageIShoppingMallRiskCaseEvent.ISummary>(secondPage);

  const hasLinkedEvent = secondPage.data.some(
    (summary) => summary.id === linkedEvent.id,
  );
  const hasNullLinkedEvent = secondPage.data.some(
    (summary) => summary.id === nullLinkedEvent.id,
  );

  TestValidator.predicate(
    "events index should include linked event with related entity",
    hasLinkedEvent,
  );
  TestValidator.predicate(
    "events index should include event without related entity",
    hasNullLinkedEvent,
  );
}
