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

export async function test_api_administrator_system_message_erase_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for verifying authorization enforcement on deleting system message templates.
  // 1. Attempt to delete a system message without authentication
  await TestValidator.httpError(
    "unauthenticated deletion attempt should fail",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.systemMessages.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 2. Authenticate as an administrator via join (registration)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const authInfo = await authorize_administrator_join(adminJoinConnection, {
    body: {},
  });
  // Create a new connection with administrator's access token
  const adminConnection: api.IConnection = { host: connection.host };
  if (!adminConnection.headers) adminConnection.headers = {};
  adminConnection.headers.Authorization = `Bearer ${authInfo.token.access}`;
  // 3. Attempt to delete a system message with authenticated administrator connection
  // Provide a valid UUID to test if administrator auth allows the operation (may 404 if not found, but not unauthorized)
  // For this test, we only confirm authorization, so catching other errors is fine
  try {
    await api.functional.discussionBoard.administrator.systemMessages.erase(
      adminConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      // Expected: not 401 or 403, allow 202, 204, or 404 (not found)
      TestValidator.predicate(
        "authenticated admin deletion must not be unauthorized",
        error.status !== 401 && error.status !== 403,
      );
    } else {
      throw error;
    }
  }
  // 4. Attempt deletion with a semi-authenticated connection (e.g., no authorization token header) to verify access control rejects it
  const unauthConn: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized deletion with no auth token should fail",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.systemMessages.erase(
        unauthConn,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
