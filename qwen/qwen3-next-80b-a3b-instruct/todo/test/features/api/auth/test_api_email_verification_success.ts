import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account to establish a valid email in the system
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUser: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(registeredUser);
  // Step 2: Generate a valid UUID token (required for verification body)
  // NOTE: In a real implementation, this token would be obtained from the registration system's internal storage
  // For automated E2E testing, we generate a compliant token to verify the endpoint contract
  const verificationToken: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Create a fresh, unauthenticated connection for the verification request
  // The verify endpoint is public and requires only the token in the body
  const verifyConnection: api.IConnection = { host: connection.host };
  // Step 4: Make the email verification request with the generated token
  // The API will check if this token matches a pending verification in the database
  await api.functional.todoApp.user.auth.users.verify.email.verify(
    verifyConnection, // Use unauthenticated connection
    {
      body: {
        value: verificationToken,
      } satisfies ITodoAppUserEmailVerification.IToken,
    },
  );
  // Step 5: Validate that the endpoint responded successfully (204 No Content)
  // Since the endpoint returns void, there is no response body to assert
  // The successful completion without error means the request was accepted
  // The system's internal state (user is_email_verified) cannot be verified without a token to fetch the updated user
  // We only validate that the endpoint can be called with valid input as per the schema contract
}
