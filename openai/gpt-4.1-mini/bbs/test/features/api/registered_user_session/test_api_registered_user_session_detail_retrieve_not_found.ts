import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

/**
 * Scenario 2: Attempt to retrieve registered user session details for a non-existent session UUID.
 *
 * Steps:
 * 1. A new registered user is created via the user join API.
 * 2. The authorized user attempts to retrieve session details by specifying a non-existent session UUID.
 *
 * Validations:
 * - The API returns HTTP 404 Not Found.
 * - The error message clearly states that the session was not found.
 * - No sensitive information is disclosed.
 * - Authorization rules are enforced as usual.
 */
export async function test_api_registered_user_session_detail_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new registered user and authorize (join updates connection headers)
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {});
  // Update user connection with token returned from join
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to retrieve session detail with a non-existent UUID
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  // Expect HTTP 404 error:
  await TestValidator.httpError(
    "not found error for non-existent registered user session",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.sessions.at(
        userConnection,
        {
          id: fakeSessionId,
        },
      );
    },
  );
}
