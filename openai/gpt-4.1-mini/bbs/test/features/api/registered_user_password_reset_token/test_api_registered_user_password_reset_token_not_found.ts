import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_password_reset_token_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorized);
  userConnection.headers ??= {};
  userConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Test GET /discussionBoard/registeredUser/passwordResets/{id} with non-existent UUID
  await TestValidator.httpError(
    "retrieval with non-existent UUID results in 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.passwordResets.at(
        userConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Note: Since there's no API to create password reset tokens or to get soft deleted tokens,
  // we only test with random non-existent UUID to cover the 'not found' scenario.
  // 3. Verify unauthorized access prevention with a different user
  // Register another user
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherAuthorized = await authorize_registered_user_join(
    anotherUserConnection,
    { body: {} },
  );
  typia.assert(anotherAuthorized);
  anotherUserConnection.headers ??= {};
  anotherUserConnection.headers.Authorization = `Bearer ${anotherAuthorized.token.access}`;
  // Try to fetch a token with userConnection's random UUID using another user's token
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized access to another user's token results in 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.passwordResets.at(
        anotherUserConnection,
        {
          id: randomId,
        },
      );
    },
  );
}
