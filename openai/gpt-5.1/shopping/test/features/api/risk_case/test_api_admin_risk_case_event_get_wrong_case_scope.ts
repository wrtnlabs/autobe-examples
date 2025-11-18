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
 * Verify that a risk case event cannot be retrieved with a mismatched parent
 * risk case code, enforcing composite scoping.
 *
 * Business goal:
 *
 * - Ensure that each IShoppingMallRiskCaseEvent belongs to exactly one
 *   IShoppingMallRiskCase, identified by case_code.
 * - Demonstrate that even if an attacker knows a valid risk case event id, they
 *   cannot access it under a different riskCaseCode.
 *
 * Flow:
 *
 * 1. Join an admin to obtain authenticated admin context (POST /auth/admin/join).
 * 2. Create two risk cases (riskCaseCodeA, riskCaseCodeB) using
 *    api.functional.shoppingMall.admin.riskCases.create.
 * 3. Create a risk case event under riskCaseCodeA via
 *    api.functional.shoppingMall.admin.riskCases.events.create and capture
 *    eventIdA.
 * 4. Confirm that fetching the event with the correct pair (riskCaseCodeA,
 *    eventIdA) returns a valid IShoppingMallRiskCaseEvent.
 * 5. Attempt to fetch the same eventIdA under riskCaseCodeB and assert that the
 *    call fails (using TestValidator.error), without checking specific HTTP
 *    status codes.
 */
export async function test_api_admin_risk_case_event_get_wrong_case_scope(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two distinct risk cases with different case_code values.
  const riskCaseBodyA = {
    case_code: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    severity: "high",
    primary_subject_type: null,
    primary_subject_id: null,
    primary_subject_display: null,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const riskCaseBodyB = {
    case_code: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    severity: "medium",
    primary_subject_type: null,
    primary_subject_id: null,
    primary_subject_display: null,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const riskCaseA: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBodyA,
    });
  typia.assert(riskCaseA);

  const riskCaseB: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBodyB,
    });
  typia.assert(riskCaseB);

  TestValidator.predicate(
    "distinct case codes must differ",
    riskCaseA.case_code !== riskCaseB.case_code,
  );

  // 3. Create a risk case event under riskCaseCodeA and capture its id.
  const eventCreateBodyA = {
    event_type: "status_changed",
    from_status: null,
    to_status: "open",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    related_entity_type: null,
    related_entity_id: null,
  } satisfies IShoppingMallRiskCaseEvent.ICreate;

  const eventA: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: riskCaseA.case_code,
        body: eventCreateBodyA,
      },
    );
  typia.assert(eventA);

  // 4. Control: fetch the event with the correct (riskCaseCodeA, eventIdA).
  const fetchedEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.at(connection, {
      riskCaseCode: riskCaseA.case_code,
      riskCaseEventId: eventA.id,
    });
  typia.assert(fetchedEvent);

  TestValidator.equals(
    "fetched event id matches created event id for same risk case",
    fetchedEvent.id,
    eventA.id,
  );

  // 5. Attempt to fetch the same event under riskCaseCodeB and assert error.
  await TestValidator.error(
    "cannot fetch event from different risk case scope",
    async () => {
      await api.functional.shoppingMall.admin.riskCases.events.at(connection, {
        riskCaseCode: riskCaseB.case_code,
        riskCaseEventId: eventA.id,
      });
    },
  );
}
