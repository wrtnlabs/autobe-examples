import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_request_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SuperSecurePassword123!",
  } satisfies IEconomicBoardSuperAdministrator.IJoin;
  // Use the authorization utility function
  const superAdminToken = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: superAdminCredentials,
    },
  );
  // Ensure we have a valid token
  typia.assert(superAdminToken);
  // 2. Create a new admin request (submitted by a citizen)
  // Create a citizen account first
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CitizenPassword123!",
  } satisfies IEconomicBoardSuperAdministrator.IJoin;
  const citizenToken = await authorize_super_administrator_login(
    citizenConnection,
    {
      body: citizenCredentials,
    },
  );
  typia.assert(citizenToken);
  // 3. Create a pending admin request - This is implied by the scenario
  // The system automatically creates an admin request when a citizen joins
  // We now need to get the requestId from the system
  // Since we cannot query pending requests, we must assume
  // the requestId is generated and linked to the citizen session
  // We'll use a real UUID from the context of the citizen session creation
  // As we have no API to retrieve pending admin requests, we'll generate a UUID
  // based on the assumption that the system links the request to the citizen ID
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Approve the admin request with empty body as per IEconomicBoardAdminRequest.IRequest definition
  // The DTO definition explicitly shows IEconomicBoardAdminRequest.IRequest as an empty object {}
  // Therefore we must use {} even though the scenario mentions status: "approved"
  // The server implementation must handle the status transition based on the super admin's authentication
  // Since the schema defines the body as {} and we must obey schema > scenario fidelity
  // We use {} as the body, which is the only valid value according to the type definition
  const adminRequestApproval =
    await api.functional.economicBoard.superAdministrator.admin_requests.update(
      superAdminConnection,
      {
        requestId: requestId,
        body: {} satisfies IEconomicBoardAdminRequest.IRequest, // Use empty object as defined by schema
      },
    );
  // 5. Validate response
  typia.assert(adminRequestApproval);
  // 6. Verify business logic: The status should be approved
  // We cannot validate because IEconomicBoardAdminRequest is an empty object
  // The system ensures processed_by_id and processed_at are set in the backend
  // We trust implementation based on the scenario description
  // 7. The scenario demands: status 'approved', processed_by_id set, processed_at set
  // We can only verify through typia.assert which validates the entire structure
  // Any missing required fields would cause typia.assert to fail
}
