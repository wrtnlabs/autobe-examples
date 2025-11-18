import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallRiskCaseEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseEvent";

/**
 * Basic happy-path verification for retrieving a single risk case event by
 * composite identifiers.
 *
 * Business workflow:
 *
 * 1. Join an admin account (POST /auth/admin/join) and rely on SDK to attach
 *    Authorization header.
 * 2. Create a parent risk case (POST /shoppingMall/admin/riskCases) and capture
 *    its case_code and id.
 * 3. Create one event under that case (POST
 *    /shoppingMall/admin/riskCases/{riskCaseCode}/events) and capture its id.
 * 4. Call GET
 *    /shoppingMall/admin/riskCases/{riskCaseCode}/events/{riskCaseEventId}.
 * 5. Assert that the retrieved event matches the created one and is properly bound
 *    to the case and (optionally) the admin.
 */
export async function test_api_admin_risk_case_event_get_basic(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a risk case for this admin
  const initialStatus = "open";
  const initialSeverity = "medium";
  const caseCode = `CASE-${RandomGenerator.alphaNumeric(8)}`;

  const riskCaseBody = {
    case_code: caseCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: initialStatus,
    severity: initialSeverity,
    primary_subject_type: null,
    primary_subject_id: null,
    primary_subject_display: null,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const createdCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBody,
    });
  typia.assert(createdCase);

  // 3. Create an event under the risk case
  const eventType = "created";
  const eventDescription = RandomGenerator.paragraph({ sentences: 5 });

  const eventBody = {
    event_type: eventType,
    from_status: null,
    to_status: initialStatus,
    description: eventDescription,
    related_entity_type: null,
    related_entity_id: null,
  } satisfies IShoppingMallRiskCaseEvent.ICreate;

  const createdEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: createdCase.case_code,
        body: eventBody,
      },
    );
  typia.assert(createdEvent);

  // Sanity checks on creation
  TestValidator.equals(
    "created event is linked to the correct risk case",
    createdEvent.shopping_mall_risk_case_id,
    createdCase.id,
  );
  TestValidator.equals(
    "created event_type matches request",
    createdEvent.event_type,
    eventType,
  );
  TestValidator.equals(
    "created event description matches request",
    createdEvent.description,
    eventDescription,
  );

  // 4. Retrieve the event via GET
  const fetchedEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.at(connection, {
      riskCaseCode: createdCase.case_code,
      riskCaseEventId: createdEvent.id,
    });
  typia.assert(fetchedEvent);

  // 5. Assertions comparing created vs fetched event
  TestValidator.equals(
    "fetched event id equals created event id",
    fetchedEvent.id,
    createdEvent.id,
  );
  TestValidator.equals(
    "fetched event is linked to same risk case id",
    fetchedEvent.shopping_mall_risk_case_id,
    createdCase.id,
  );
  TestValidator.equals(
    "fetched event_type matches created event_type",
    fetchedEvent.event_type,
    createdEvent.event_type,
  );
  TestValidator.equals(
    "fetched description matches created description",
    fetchedEvent.description,
    createdEvent.description,
  );
  TestValidator.equals(
    "fetched from_status matches created from_status",
    fetchedEvent.from_status,
    createdEvent.from_status,
  );
  TestValidator.equals(
    "fetched to_status matches created to_status",
    fetchedEvent.to_status,
    createdEvent.to_status,
  );
  TestValidator.equals(
    "fetched related_entity_type matches created related_entity_type",
    fetchedEvent.related_entity_type,
    createdEvent.related_entity_type,
  );
  TestValidator.equals(
    "fetched related_entity_id matches created related_entity_id",
    fetchedEvent.related_entity_id,
    createdEvent.related_entity_id,
  );

  // created_at is already type-validated by typia.assert; just ensure it is identical
  TestValidator.equals(
    "fetched created_at matches created created_at",
    fetchedEvent.created_at,
    createdEvent.created_at,
  );

  // If admin is populated on fetched event, ensure it matches the joining admin context
  await TestValidator.predicate(
    "admin context on fetched event is either null or matches joined admin",
    async () => {
      if (fetchedEvent.admin == null) return true;
      return (
        fetchedEvent.admin.id === adminAuthorized.id &&
        fetchedEvent.admin.email === adminAuthorized.email
      );
    },
  );
}
