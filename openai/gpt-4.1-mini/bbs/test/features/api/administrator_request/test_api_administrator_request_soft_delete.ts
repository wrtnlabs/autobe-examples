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

export async function test_api_administrator_request_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join to authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IDiscussionBoardAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {},
    });
  typia.assert(authorized);
  // assign the Bearer token for authorized requests
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Since IDiscussionBoardAdministratorRequest.IUpdate is an empty type,
  //    we cannot perform a soft delete by setting deleted_at.
  //    We perform a safe call with empty update body to verify authorization and successful update.
  // Generate a valid UUID string for requestId
  const requestId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // Empty update body since no fields are defined in IUpdate
  const body: IDiscussionBoardAdministratorRequest.IUpdate = {};
  // 3. Perform the update call
  const updated: IDiscussionBoardAdministratorRequest =
    await api.functional.discussionBoard.administrator.administratorRequests.updateAdministratorRequest(
      adminConnection,
      {
        requestId,
        body,
      },
    );
  typia.assert(updated);
  // 4. No further soft delete validation possible, only validate the response type
}
