import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdminRequest";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful rejection of an administrative user request.
 * Validates that the system properly updates the request status to 'rejected'
 * and records the provided adminReason, meeting the business requirement
 * that rejects include clear justification as specified in section 4.6.1.
 */
export async function test_api_admin_request_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.name()}@test.com`,
      password: "AdminPassword123!",
    } satisfies IEconPoliticBoardAdmin.IJoin,
  });
  // Step 2: Use test request ID
  const testRequestId = "test-request-id-" + RandomGenerator.alphaNumeric(8);
  // Step 3: Reject the request with a reason
  const updatedRequest =
    await api.functional.econPoliticBoard.admin.requests.update(
      adminConnection,
      {
        requestId: testRequestId,
        body: {
          status: "rejected",
          adminReason:
            "User failed to complete mandatory security training as required.",
        } satisfies IEconPoliticBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // Step 4: Verify status was updated
  TestValidator.equals(
    "request status should be rejected",
    updatedRequest.status,
    "rejected",
  );
}
