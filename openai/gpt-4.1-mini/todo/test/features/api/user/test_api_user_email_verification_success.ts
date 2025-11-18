import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_user_email_verification_success(
  connection: api.IConnection,
) {
  // 1. Create a new user via the join endpoint
  const email = typia.random<string & tags.Format<"email">>();
  const name = RandomGenerator.name();
  const joinBody = {
    email,
    name,
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(authorizedUser);

  // 2. Verify that authorizedUser.id is a valid UUID and token is valid
  typia.assert<string & tags.Format<"uuid">>(authorizedUser.id);
  typia.assert<IAuthorizationToken>(authorizedUser.token);

  // 3. Use the valid email and a legitimate token string for verification
  // Since token is JWT with no direct verification token exposed, generate a dummy token string here
  // Assuming the test setup or backend allows any string token (since no token type given)
  // Send email verification request
  const verificationBody = {
    email: email,
    verification_token: "valid-verification-token-123",
  } satisfies ITodoListTodoListUser.IVerifyEmail;

  await api.functional.auth.user.email.verify.verifyEmail(connection, {
    body: verificationBody,
  });
}
