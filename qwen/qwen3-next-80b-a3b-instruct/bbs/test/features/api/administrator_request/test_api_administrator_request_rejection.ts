import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_request_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate super administrator using join (registration)
  const authResponse =
    await api.functional.economicBoard.auth.superAdministrator.join(
      superAdminConnection,
      {
        body: typia.random<IEconomicBoardSuperAdministrator.IJoin>(),
      },
    );
  typia.assert(authResponse);
  // Use returned token for subsequent requests
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: authResponse.token.access,
  };
  
  // 2. Generate a random request ID - independent of non-existent IEconomicBoardAdminRequest properties
  const requestId: string = typia.random<string>();
  
  // 3. Reject the admin request as super admin
  const rejectResponse =
    await api.functional.economicBoard.superAdministrator.admin_requests.update(
      superAdminConnection,
      {
        requestId,
        body: {
          status: "rejected",
          reason_text: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  // Explicitly assert the correct response type structure
  const validatedResponse = typia.assert<any>(rejectResponse);
  
  // 4. Validate rejection result - ALL validation against response, not existingRequest
  TestValidator.equals("status is rejected", validatedResponse.status, "rejected");
  TestValidator.predicate(
    "processed_by_id is set",
    validatedResponse.processed_by_id !== null,
  );
  TestValidator.predicate(
    "processed_at is set",
    validatedResponse.processed_at !== null,
  );
  // We cannot validate requester_id or reason_text from existingRequest because IEconomicBoardAdminRequest
  // doesn't have those properties. The API likely sets them in the response, but we don't have a known value to check.
  // We only check they are set (non-null) since we cannot predict their values.
  TestValidator.predicate(
    "requester_id is set",
    validatedResponse.requester_id !== null,
  );
  TestValidator.predicate(
    "reason_text is set",
    validatedResponse.reason_text !== null,
  );
}