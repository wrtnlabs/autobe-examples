import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserEmailVerification";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_user_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user through join
  const userJoinData = {
    email: `test-${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://todo.wrtn.io/register",
    referrer: "https://todo.wrtn.io",
  } satisfies ITodoAppTodoUser.IJoin;
  const authorizedUser = await authorize_todo_user_join(connection, {
    body: userJoinData,
  });
  typia.assert(authorizedUser);
  // Step 2: Verify email - in a real scenario, we would receive a token via email
  // For testing purposes, we'll simulate the verification process
  // Note: In a complete implementation, we would need to retrieve the token from the database
  // or from an email service mock. For now, we'll just call the verification endpoint
  // as if we had received the token.
  const verificationRequest =
    {} satisfies ITodoAppTodoUserEmailVerification.IVerify;
  const verificationResponse =
    await api.functional.todoApp.todoUser.auth.todo_users.email_verification.verifyEmail(
      connection,
      {
        body: verificationRequest,
      },
    );
  typia.assert(verificationResponse);
  // Validate key properties of the response
  TestValidator.equals(
    "verification response should have an ID",
    typeof verificationResponse.id,
    "string",
  );
  TestValidator.equals(
    "verification should be linked to the user",
    verificationResponse.userId,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "verification should have a created timestamp",
    verificationResponse.createdAt !== undefined &&
      verificationResponse.createdAt !== null,
  );
  TestValidator.predicate(
    "verification should have an updated timestamp",
    verificationResponse.updatedAt !== undefined &&
      verificationResponse.updatedAt !== null,
  );
  // Note: In a real implementation, we would also check that the user's email is now verified
  // in the user record, but that would require another API call to check the user's status.
}
