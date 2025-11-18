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
 * Validate that detailed risk case event retrieval is admin-authenticated only.
 *
 * Business context: Risk case events contain sensitive governance/audit
 * information that must only be exposed to authenticated administrator actors.
 * Even if an attacker knows a valid riskCaseCode and riskCaseEventId, they must
 * not be able to read the event timeline without a valid admin token.
 *
 * Steps:
 *
 * 1. Register an admin via /auth/admin/join, which also authenticates the SDK
 *    connection by setting Authorization header automatically.
 * 2. Create a risk case via /shoppingMall/admin/riskCases and capture its
 *    case_code and id.
 * 3. Under this case, create a risk case event via
 *    /shoppingMall/admin/riskCases/{riskCaseCode}/events and capture the event
 *    id.
 * 4. Simulate an unauthenticated client by cloning the connection and replacing
 *    its headers with an empty object.
 *
 *    - Call the GET event detail endpoint with this unauthenticated connection and
 *         assert that it fails with an HTTP 401/403 error using
 *         TestValidator.httpError.
 * 5. Using the original authenticated connection, call the same GET endpoint
 *    successfully and validate that the returned IShoppingMallRiskCaseEvent
 *    matches the created event.
 */
export async function test_api_admin_risk_case_event_get_authorization_required(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a risk case.
  const riskCaseBody = typia.random<IShoppingMallRiskCase.ICreate>();
  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBody,
    });
  typia.assert<IShoppingMallRiskCase>(riskCase);

  // 3. Create a risk case event for the risk case.
  const eventBody = typia.random<IShoppingMallRiskCaseEvent.ICreate>();
  const createdEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.create(
      connection,
      {
        riskCaseCode: riskCase.case_code,
        body: eventBody,
      },
    );
  typia.assert<IShoppingMallRiskCaseEvent>(createdEvent);

  // 4. Attempt to read the event with an unauthenticated connection.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated admin cannot read risk case event",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.riskCases.events.at(
        unauthenticatedConnection,
        {
          riskCaseCode: riskCase.case_code,
          riskCaseEventId: createdEvent.id,
        },
      );
    },
  );

  // 5. Authenticated admin can read the same event successfully.
  const fetchedEvent: IShoppingMallRiskCaseEvent =
    await api.functional.shoppingMall.admin.riskCases.events.at(connection, {
      riskCaseCode: riskCase.case_code,
      riskCaseEventId: createdEvent.id,
    });
  typia.assert<IShoppingMallRiskCaseEvent>(fetchedEvent);

  // Validate identity and linkage to parent case.
  TestValidator.equals(
    "fetched event id matches created event id",
    fetchedEvent.id,
    createdEvent.id,
  );
  TestValidator.equals(
    "fetched event belongs to same risk case",
    fetchedEvent.shopping_mall_risk_case_id,
    riskCase.id,
  );
}
