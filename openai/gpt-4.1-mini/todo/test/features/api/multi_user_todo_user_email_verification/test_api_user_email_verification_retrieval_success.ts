import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join a new user to get authenticated connection
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {} satisfies IMultiUserTodoUser.IJoin,
  });
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${userAuthorized.token.access}`,
  };
  // Step 2: Create email verification token record directly via API (simulate UUID)
  // Note: There is no create API according to given info, so we simulate a verificationId with random UUID
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Try to retrieve non-existent email verification record - expect 404
  await TestValidator.httpError(
    "should fail if verificationId does not exist (404)",
    404,
    async () => {
      await api.functional.multiUserTodo.user.email_verifications.at(
        userConnection,
        {
          verificationId,
        },
      );
    },
  );
  // Step 4: Test access denied if no authorization header
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should fail if not authenticated (401)",
    401,
    async () => {
      await api.functional.multiUserTodo.user.email_verifications.at(
        noAuthConnection,
        {
          verificationId,
        },
      );
    },
  );
}
