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
 * Validate that listing risk case events requires admin authorization.
 *
 * Business context:
 *
 * - Risk case events represent sensitive governance/fraud activity and must only
 *   be visible to authenticated admin actors.
 * - The listing endpoint PATCH
 *   /shoppingMall/admin/riskCases/{riskCaseCode}/events must reject
 *   unauthenticated callers while allowing properly authenticated admins to
 *   retrieve the timeline.
 *
 * Scenario steps:
 *
 * 1. Admin joins the platform using /auth/admin/join, which also authenticates the
 *    connection via Authorization header.
 * 2. Using that admin context, create a risk case via
 *    /shoppingMall/admin/riskCases.
 * 3. Create at least one event for that risk case via
 *    /shoppingMall/admin/riskCases/{riskCaseCode}/events (POST).
 * 4. Clone the connection to an unauthenticated variant (headers: {}) and attempt
 *    to list events via PATCH
 *    /shoppingMall/admin/riskCases/{riskCaseCode}/events.
 *
 *    - Expect authorization failure and assert an error is thrown.
 * 5. With the original authenticated connection, call the same listing endpoint
 *    and assert success, validating pagination and that created events appear.
 */
export async function test_api_admin_risk_case_events_list_authorization_required(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration + implicit login)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a risk case using authenticated admin
  const riskCaseBody = {
    case_code: `RC-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Create a risk case event under this risk case
  const eventType = "status_changed_to_under_review";
  const eventCreateBody = {
    event_type: eventType,
    from_status: riskCase.status,
    to_status: "under_review",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    related_entity_type: null,
    related_entity_id: null,
  } satisfies IShoppingMallRiskCaseEvent.ICreate;

  const createdEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: riskCase.case_code,
        body: eventCreateBody,
      },
    );
  typia.assert(createdEvent);

  // 4. Unauthorized listing attempt with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const listRequestBody = {
    page: 1,
    limit: 10,
    event_type: null,
    from_created_at: null,
    to_created_at: null,
    admin_id: null,
    sort_direction: null,
  } satisfies IShoppingMallRiskCaseEvent.IRequest;

  await TestValidator.error(
    "unauthenticated caller must not list risk case events",
    async () => {
      await api.functional.shoppingMall.admin.riskCases.events.index(
        unauthConn,
        {
          riskCaseCode: riskCase.case_code,
          body: listRequestBody,
        },
      );
    },
  );

  // 5. Authorized listing attempt with authenticated admin connection
  const pageResult: IPageIShoppingMallRiskCaseEvent.ISummary =
    await api.functional.shoppingMall.admin.riskCases.events.index(connection, {
      riskCaseCode: riskCase.case_code,
      body: listRequestBody,
    });
  typia.assert(pageResult);

  // Validate pagination information
  await TestValidator.predicate(
    "current page should be 1",
    async () => pageResult.pagination.current === 1,
  );

  await TestValidator.predicate(
    "at least one event should be returned for the risk case",
    async () => pageResult.data.length >= 1,
  );

  // Ensure at least one returned event matches the created event type
  const matched = pageResult.data.some(
    (summary) => summary.event_type === eventType,
  );

  await TestValidator.predicate(
    "at least one listed event should have the created event_type",
    async () => matched,
  );
}
