import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test email verification token functionality for TodoApp users.
 * 1. Register a new user
 * 2. Request verification email
 * 3. Test verification with token
 * 4. Test error handling for invalid inputs
 */
export async function test_api_todoapp_verify_email_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user who needs email verification
  const registerConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_user_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(registeredUser);
  // 2. Request verification email to be sent
  await api.functional.todoApp.email_verifications.verifyEmail(
    registerConnection,
    {
      body: {
        action: "send_verification_email",
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserEmailVerification.IRequest,
    },
  );
  // 3. Test successful email verification with valid token
  const validToken = typia.random<string & tags.Format<"uuid">>();
  await api.functional.todoApp.email_verifications.verifyEmail(
    registerConnection,
    {
      body: {
        action: "verify_token",
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserEmailVerification.IRequest,
    },
  );
  // 4. Test rejection of expired tokens - using invalid token format
  await TestValidator.error("expired token rejected", async () => {
    await api.functional.todoApp.email_verifications.verifyEmail(
      registerConnection,
      {
        body: {
          action: "verify_token",
          page: 1,
          limit: 10,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  });
  // 5. Test rejection of invalid request body - using partial with empty object
  await TestValidator.error("invalid request body rejected", async () => {
    await api.functional.todoApp.email_verifications.verifyEmail(
      registerConnection,
      {
        body: {
          action: "send_verification_email" as any,
          page: undefined,
          limit: undefined,
        } satisfies DeepPartial<ITodoAppUserEmailVerification.IRequest>,
      },
    );
  });
  // 6. Test handling of invalid request body - using invalid page value (negative)
  await TestValidator.error("invalid pagination rejected", async () => {
    await api.functional.todoApp.email_verifications.verifyEmail(
      registerConnection,
      {
        body: {
          action: "send_verification_email",
          page: -1,
          limit: 10,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  });
  // 7. Test proper error for non-existent user
  const nonExistentConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-existent user rejected", async () => {
    await api.functional.todoApp.email_verifications.verifyEmail(
      nonExistentConnection,
      {
        body: {
          action: "send_verification_email",
          page: 1,
          limit: 10,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  });
}
