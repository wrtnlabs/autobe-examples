import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account to use for login testing
  const userCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppUser.IJoin;
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_user_join(userConnection, {
    body: userCreds,
  });
  typia.assert(registeredUser);
  // Step 2: Use the credentials to perform successful login
  const loginConnection: api.IConnection = { host: connection.host };
  const authResponse: ITodoAppUser.IAuthorized = await authorize_user_login(
    loginConnection,
    {
      body: {
        email: userCreds.email,
        password: userCreds.password,
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(authResponse);
  // Step 3: Validate the authentication response contains expected user profile information
  // We trust typia.assert() already validated the entire structure, so we only validate business logic
  // Since we can't know the display_name value (it's derived from email prefix) we just validate it exists
  TestValidator.predicate(
    "display name exists and is a string",
    typeof authResponse.display_name === "string" &&
      authResponse.display_name.length > 0,
  );
  // Step 4: Validate the token structure
  TestValidator.equals(
    "access token exists",
    typeof authResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof authResponse.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token is not empty",
    authResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    authResponse.token.refresh.length > 0,
  );
  // Step 5: Validate expiration timestamps are valid date-time format with nanosecond precision
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,9}Z$/.test(
      authResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,9}Z$/.test(
      authResponse.token.refreshable_until,
    ),
  );
}
