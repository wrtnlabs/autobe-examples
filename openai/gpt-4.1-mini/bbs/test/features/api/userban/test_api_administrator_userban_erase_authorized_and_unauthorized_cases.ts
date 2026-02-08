import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { INullResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/INullResponse";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_userban_erase_authorized_and_unauthorized_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Authorized admin can erase a user ban successfully
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin joins (register) to get authorization
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Apply token to connection
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // We need a real banId to erase - since test scenario doesn't specify ban creation,
  // create a ban by simulating or using any valid banId, but as we have no ban creation
  // API provided, we will simulate a random UUID as banId assuming it exists (best effort)
  const banId = typia.random<string & tags.Format<"uuid">>();
  // Administrator erases the ban
  const output =
    await api.functional.discussionBoard.administrator.userBans.erase(
      adminConnection,
      { banId },
    );
  // Assert the response is empty (204 No Content simulated by INullResponse)
  typia.assert(output);
  // Scenario 2: Unauthorized attempts to erase ban should fail
  // Case 2-1: No authorization headers
  await TestValidator.httpError(
    "erase ban unauthorized without token",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.userBans.erase(
        { host: connection.host }, // base connection, no auth
        { banId },
      );
    },
  );
  // Case 2-2: Invalid authorization token
  const invalidConnection: api.IConnection = { host: connection.host };
  invalidConnection.headers = { Authorization: "Bearer invalid.token" };
  await TestValidator.httpError(
    "erase ban unauthorized with invalid token",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.userBans.erase(
        invalidConnection,
        { banId },
      );
    },
  );
}
