import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_registration_successful(
  connection: api.IConnection,
) {
  // Step 1: Prepare valid registration data with proper session context
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const registrationData = {
    email: email,
    password: password,
    href: href,
    referrer: referrer,
  } satisfies ITodoAppUser.ICreate;

  // Step 2: Register a new user account
  const authorizedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedUser);

  // Step 3: Validate user account initialization
  TestValidator.equals(
    "user email matches registration input",
    authorizedUser.email,
    email,
  );

  // Step 4: Validate JWT token structure
  const token: IAuthorizationToken = authorizedUser.token;
  typia.assert(token);

  // Step 5: Validate token expiration timestamps are in future
  const now = new Date();
  const accessExpiration = new Date(token.expired_at);
  const refreshExpiration = new Date(token.refreshable_until);

  TestValidator.predicate(
    "access token expiration is in the future",
    accessExpiration.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshExpiration.getTime() > now.getTime(),
  );

  // Step 6: Validate token expiration order (refresh token should expire after access token)
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshExpiration.getTime() >= accessExpiration.getTime(),
  );
}
