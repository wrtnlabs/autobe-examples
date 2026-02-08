import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_update_status_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {}, // Currently no properties for join
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare valid requestId and update body
  const validRequestId = typia.random<string & tags.Format<"uuid">>();
  // Since DTO is empty, but scenario says to update status and reason, use those fields
  // Status enum must be 'approved' or 'rejected'
  const validStatus = (Math.random() < 0.5 ? "approved" : "rejected") as
    | "approved"
    | "rejected";
  const newReason = `Updated reason for testing ${typia.random<string>()}`;
  const body = {
    status: validStatus,
    reason: newReason,
  };
  // 3. Update the administrator request
  const updatedRequest =
    await api.functional.discussionBoard.administrator.administratorRequests.updateAdministratorRequest(
      adminConnection,
      {
        requestId: validRequestId,
        body,
      },
    );
  typia.assert(updatedRequest);

  // Removed validation on properties that don't exist in the returned object

  // 5. Unauthorized update attempt using base connection
  await TestValidator.error("unauthorized update", async () => {
    await api.functional.discussionBoard.administrator.administratorRequests.updateAdministratorRequest(
      connection,
      {
        requestId: validRequestId,
        body,
      },
    );
  });
  // 6. Invalid UUID test
  await TestValidator.error("invalid UUID requestId", async () => {
    await api.functional.discussionBoard.administrator.administratorRequests.updateAdministratorRequest(
      adminConnection,
      {
        requestId: "not-a-uuid",
        body,
      },
    );
  });
}
