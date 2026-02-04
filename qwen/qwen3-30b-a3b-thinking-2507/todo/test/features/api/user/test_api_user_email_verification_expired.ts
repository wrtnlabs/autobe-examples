import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_email_verification_expired(
  connection: api.IConnection,
): Promise<void> {
  // Create a user who will be used to test email verification
  const createdUser = await authorize_user_join(connection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.com",
      password: "password123",
    } satisfies ITodoUser.IJoin,
  });
  // Attempt to verify email using the connection (should fail as the token is expired)
  await TestValidator.error(
    "Token has expired for email verification",
    async () => {
      await api.functional.todo.user.auth.users.verify.email.verifyEmail(
        connection,
        {
          body: {} satisfies ITodoUserEmailVerification.IVerify,
        },
      );
    },
  );
}
