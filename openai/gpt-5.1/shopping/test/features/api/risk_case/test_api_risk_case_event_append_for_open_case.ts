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
 * E2E: admin appends a non-status-change note event to an open risk case
 * timeline.
 *
 * Business flow:
 *
 * 1. Join/register an admin via /auth/admin/join and rely on SDK to attach
 *    Authorization header.
 * 2. Create an open risk case via /shoppingMall/admin/riskCases with severity and
 *    optional subject info.
 * 3. Append a new note-type event via
 *    /shoppingMall/admin/riskCases/{riskCaseCode}/events without status
 *    transition.
 * 4. Validate the event response fields and that description/event_type match the
 *    request.
 * 5. List events via PATCH /shoppingMall/admin/riskCases/{riskCaseCode}/events and
 *    confirm the new event is present.
 */
export async function test_api_risk_case_event_append_for_open_case(
  connection: api.IConnection,
) {
  // 1. Admin join/authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">) | null
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create an open risk case
  const riskCaseCode = `RISK-${RandomGenerator.alphaNumeric(8)}`;
  const riskCaseCreateBody = {
    case_code: riskCaseCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    severity: "high",
    primary_subject_type: "order",
    primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
    primary_subject_display: `order-${RandomGenerator.alphaNumeric(6)}`,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const createdCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseCreateBody,
    });
  typia.assert(createdCase);

  TestValidator.equals(
    "risk case code should match creation request",
    createdCase.case_code,
    riskCaseCreateBody.case_code,
  );
  TestValidator.equals(
    "risk case status should be open",
    createdCase.status,
    riskCaseCreateBody.status,
  );

  // 3. Append a non-status-change note event
  const noteDescription = RandomGenerator.paragraph({ sentences: 5 });
  const eventType = "note_added";

  const riskCaseEventCreateBody = {
    event_type: eventType,
    from_status: null,
    to_status: null,
    description: noteDescription,
    related_entity_type: null,
    related_entity_id: null,
  } satisfies IShoppingMallRiskCaseEvent.ICreate;

  const createdEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: createdCase.case_code,
        body: riskCaseEventCreateBody,
      },
    );
  typia.assert(createdEvent);

  TestValidator.equals(
    "event_type should equal request",
    createdEvent.event_type,
    eventType,
  );
  TestValidator.equals(
    "event description should equal request",
    createdEvent.description ?? null,
    riskCaseEventCreateBody.description ?? null,
  );
  TestValidator.equals(
    "related_entity_type should be null when created as null",
    createdEvent.related_entity_type ?? null,
    riskCaseEventCreateBody.related_entity_type ?? null,
  );
  TestValidator.equals(
    "related_entity_id should be null when created as null",
    createdEvent.related_entity_id ?? null,
    riskCaseEventCreateBody.related_entity_id ?? null,
  );
  TestValidator.equals(
    "created event must belong to the created risk case",
    createdEvent.shopping_mall_risk_case_id,
    createdCase.id,
  );

  // 4. Verify via listing that the event is present
  const listRequestBody = {
    page: typia.random<number & tags.Type<"int32">>(),
    limit: typia.random<number & tags.Type<"int32">>(),
    event_type: eventType,
    from_created_at: null,
    to_created_at: null,
    admin_id: null,
    sort_direction: null,
  } satisfies IShoppingMallRiskCaseEvent.IRequest;

  const pageResult: IPageIShoppingMallRiskCaseEvent.ISummary =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode: createdCase.case_code,
      body: listRequestBody,
    });
  typia.assert(pageResult);

  // Only check that some page was returned; page/limit are random tagged ints
  TestValidator.predicate(
    "events index should return at least one record",
    pageResult.data.length >= 1,
  );

  const matched = pageResult.data.find((row) => row.id === createdEvent.id);
  TestValidator.predicate(
    "created event should appear in risk case events index",
    matched !== undefined,
  );

  if (matched) {
    TestValidator.equals(
      "matched event type should equal event_type",
      matched.event_type,
      eventType,
    );
    TestValidator.equals(
      "matched risk_case_id should equal parent risk case id",
      matched.risk_case_id,
      createdCase.id,
    );
  }
}
