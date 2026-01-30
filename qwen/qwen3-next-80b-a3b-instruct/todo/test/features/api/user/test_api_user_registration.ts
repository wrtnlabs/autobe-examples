import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the user actor
  const userConnection: api.IConnection = { host: connection.host };
  // Generate valid test data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Execute user registration using the authorized utility function
  const result: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email,
        password,
      },
    },
  );
  // Validate the response structure
  typia.assert(result);
  // Verify email matches the input
  TestValidator.equals(
    "user email matches registration email",
    result.email,
    email,
  );
  // Verify username is generated and non-empty
  TestValidator.predicate("username is not empty", result.username.length > 0);
  // Verify email_verified is false (new users are unverified)
  TestValidator.equals(
    "new user email_verified is false",
    result.email_verified,
    false,
  );
  // Verify id is a valid UUID (validated by typia.assert, but we can still check it exists)
  TestValidator.predicate(
    "id exists and is a string",
    typeof result.id === "string",
  );
  // Verify token structure
  TestValidator.equals("token exists", result.token !== null, true);
  TestValidator.equals(
    "access token exists",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    result.token.refresh.length > 0,
    true,
  );
  // Verify expiration timestamps exist and are strings (validated by typia.assert)
  TestValidator.predicate(
    "expired_at exists",
    typeof result.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refreshable_until exists",
    typeof result.token.refreshable_until === "string",
  );
  // Test that the same email cannot be used again
  const duplicateEmailConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_user_join(duplicateEmailConnection, {
        body: {
          email: result.email, // using the same email from successful registration
          password: RandomGenerator.alphaNumeric(16),
        },
      });
    },
  );
}
