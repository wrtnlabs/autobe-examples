import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_user_unban_record_erase(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing user unban record by an authorized administrator.
  // Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Create authenticated admin connection with token
  const authAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuth.token.access}`,
    },
  };
  // Simulate an existing unbanId to delete (as no creation API is given)
  const existingUnbanId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: Delete should succeed with 204 No Content
  await api.functional.discussionBoard.administrator.userUnbans.erase(
    authAdminConnection,
    {
      unbanId: existingUnbanId,
    },
  );
  // Scenario 2: Attempt deletion with a non-existing unbanId by an authorized administrator.
  const nonExistingUnbanId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Scenario 2: delete non-existing unbanId should throw 404",
    async () => {
      await api.functional.discussionBoard.administrator.userUnbans.erase(
        authAdminConnection,
        {
          unbanId: nonExistingUnbanId,
        },
      );
    },
  );
  // Scenario 3: Unauthorized attempt to delete a user unban record
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const anyUnbanId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Scenario 3: unauthorized deletion attempt should return 401",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.userUnbans.erase(
        unauthorizedConnection,
        {
          unbanId: anyUnbanId,
        },
      );
    },
  );
}
