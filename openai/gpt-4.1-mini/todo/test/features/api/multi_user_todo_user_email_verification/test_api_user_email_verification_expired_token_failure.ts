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

export async function test_api_user_email_verification_expired_token_failure(
  connection: api.IConnection,
): Promise<void> {
  // This test checks that when an expired or invalid email verification token is submitted, the API responds with an error indicating the token is invalid or expired, and the user's email remains unverified.
  // 1. Register a new user with unique email, password, and display name.
  const userConnection: api.IConnection = { host: connection.host };
  const joinPayload: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: `https://${RandomGenerator.alphabets(5)}.example.com/join`,
    referrer: `https://${RandomGenerator.alphabets(5)}.example.com/referrer`,
    ip: null,
  };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: joinPayload,
  });
  typia.assert(authorizedUser);
  // 2. Craft an invalid token (random string that does not exist in DB).
  // Since we cannot extract a real expired token, randomly generate an invalid token string.
  const invalidToken = RandomGenerator.alphaNumeric(32);
  // 3. Attempt to submit the invalid/expired token via email verification endpoint.
  await TestValidator.error("expired or invalid token error", async () => {
    await api.functional.multiUserTodo.user.email_verifications.processEmailVerification(
      userConnection,
      {
        body: {
          token: invalidToken,
          page: null,
          limit: null,
        } satisfies IMultiUserTodoUserEmailVerification.IRequest,
      },
    );
  });
  // 4. Ensure that user's email remains unverified - this means the verification token does NOT exist or is rejected.
  // We can attempt fetching user summary or profile, but no direct fetch API was given.
  // Instead, we assert the token error is raised and trust that the system maintains unverified state.
}
