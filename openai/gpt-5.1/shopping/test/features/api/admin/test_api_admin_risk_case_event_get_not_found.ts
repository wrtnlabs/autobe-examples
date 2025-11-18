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
 * Validate GET of a non-existent risk case event under an existing risk case.
 *
 * Business purpose:
 *
 * - Ensure that the admin risk-case timeline API does not return an event when
 *   the specified event id does not exist under a valid risk case.
 * - Confirm that the system fails the request for an unknown event id instead of
 *   fabricating or leaking incorrect data.
 *
 * Scenario steps:
 *
 * 1. Register an admin via POST /auth/admin/join and obtain an authorized admin
 *    session (token is handled by SDK).
 * 2. Create a concrete risk case using POST /shoppingMall/admin/riskCases,
 *    capturing the `case_code` from the response.
 * 3. Optionally create a valid event for the case using POST
 *    /shoppingMall/admin/riskCases/{riskCaseCode}/events to ensure that the
 *    case is active and that at least one valid event can be created.
 * 4. Generate a random UUID string value that is different from the created event
 *    id(s) to represent a non-existent `riskCaseEventId`.
 * 5. Invoke GET
 *    /shoppingMall/admin/riskCases/{riskCaseCode}/events/{riskCaseEventId}
 *    using the known good `riskCaseCode` but the non-existent event id.
 * 6. Use TestValidator.error to assert that the API call fails for that
 *    non-existent event. Do NOT check concrete HTTP status codes or error
 *    structure; only validate that an error is thrown.
 */
export async function test_api_admin_risk_case_event_get_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin (join)
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a risk case
  const riskCaseCreateBody = typia.random<IShoppingMallRiskCase.ICreate>();
  const createdCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseCreateBody,
    });
  typia.assert(createdCase);

  // 3. Optionally create a valid event for the case to ensure the case is active
  const eventCreateBody: IShoppingMallRiskCaseEvent.ICreate =
    typia.random<IShoppingMallRiskCaseEvent.ICreate>();
  const validEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: createdCase.case_code,
        body: eventCreateBody,
      },
    );
  typia.assert(validEvent);

  // 4. Generate a non-existent event id (random UUID different from validEvent.id)
  let nonexistentEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonexistentEventId === validEvent.id) {
    nonexistentEventId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5~6. Try to GET the non-existent event and assert that it fails
  await TestValidator.error(
    "get non-existent risk case event should fail",
    async () => {
      await api.functional.shoppingMall.admin.riskCases.events.at(connection, {
        riskCaseCode: createdCase.case_code,
        riskCaseEventId: nonexistentEventId,
      });
    },
  );
}
