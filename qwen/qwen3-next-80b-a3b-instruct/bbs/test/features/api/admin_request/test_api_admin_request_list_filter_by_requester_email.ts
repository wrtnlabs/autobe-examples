import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_admin_request_list_filter_by_requester_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account for accessing admin requests
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminUser = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: "superadmin@example.com",
        password: "SecurePassword123!",
      },
    },
  );
  typia.assert(superAdminUser);
  // 2. Create a regular user (requester) with the target email
  const requesterConnection: api.IConnection = { host: connection.host };
  const requester = await authorize_super_administrator_join(
    requesterConnection,
    {
      body: {
        email: "citizen@example.com",
        password: "SecurePassword123!",
      },
    },
  );
  typia.assert(requester);
  // 3. Create connection for superAdmin to list filtered admin requests
  const filteredConnection: api.IConnection = { host: connection.host };
  filteredConnection.headers = { Authorization: superAdminUser.token.access };
  // 4. Filter admin requests by actor_id (the requester's id)
  // Since requester_email is not a field in IEconomicBoardAdministratorAuditLog.IRequest,
  // the actual available field is actor_id which identifies the user who made the request.
  // The scenario requires filtering by requester email, but we map this to the available actor_id.
  // We assume the database already has one admin request from citizen@example.com (per test data prep).
  const filterBody: IEconomicBoardAdministratorAuditLog.IRequest = {
    status: "pending", // We can filter by status
    actor_id: requester.id, // Use the id from the requester user (this is the only way to filter by requester)
    limit: 10,
    page: 1,
  };
  const result =
    await api.functional.economicBoard.superAdministrator.admin.admin_requests.index(
      filteredConnection,
      {
        body: filterBody,
      },
    );
  typia.assert(result);
  // 5. Validate: The returned request must be from "citizen@example.com"
  TestValidator.equals(
    "paginate responds with data list",
    result.data.length,
    1,
  );
  TestValidator.equals(
    "correct requester email",
    result.data[0].actor.email,
    "citizen@example.com",
  );
  TestValidator.notEquals(
    "response doesn't contain other user",
    result.data[0].actor.email,
    "superadmin@example.com",
  );
  TestValidator.equals(
    "action type is admin request",
    result.data[0].action_type,
    "approve_admin_request",
  );
  TestValidator.equals(
    "requester id matches",
    result.data[0].actor.id,
    requester.id,
  );
  TestValidator.equals("page number is correct", result.pagination.current, 1);
  TestValidator.equals("limit is correct", result.pagination.limit, 10);
  TestValidator.equals(
    "total records is correct",
    result.pagination.records,
    1,
  );
  TestValidator.equals("pages is correct", result.pagination.pages, 1);
}
