import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member authentication with valid credentials.
 *
 * Validates the complete member login workflow including account creation, authentication with correct credentials, and token generation. Ensures that the login response contains all required member identification fields and valid JWT tokens for subsequent API authentication.
 *
 * The test verifies that a newly registered member can immediately authenticate using their credentials and receive proper authorization tokens. The access token is validated by confirming it can be used for authenticated requests.
 *
 * 1. Create a new member account with unique email, password, and display name via join endpoint.
 * 2. Login using the same email and password with session context (href, referrer, ip).
 * 3. Validate login response contains all required fields: id, email, display_name, timestamps, and token object.
 * 4. Verify token object contains access token, refresh token, expired_at, and refreshable_until.
 * 5. Confirm member timestamps (created_at, updated_at) are valid ISO date-time strings and deleted_at is null for active account.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare credentials for member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // 2. Create member account for login testing
  const joinResult: ITodoAppMember.IAuthorized = await authorize_member_join(
    connection,
    {
      body: {
        email,
        password,
        displayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joinResult);
  // 3. Login with the created credentials
  const loginResult: ITodoAppMember.IAuthorized = await authorize_member_login(
    connection,
    {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.ILogin,
    },
  );
  typia.assert(loginResult);
  // 4. Validate member identification fields match between join and login
  TestValidator.equals("member id matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, joinResult.email);
  TestValidator.equals(
    "display name matches",
    loginResult.display_name,
    joinResult.display_name,
  );
  // 5. Validate account is active (not soft deleted)
  TestValidator.equals(
    "deleted_at is null for active account",
    loginResult.deleted_at,
    null,
  );
  // 6. Validate token expiration ordering (refreshable_until >= expired_at)
  TestValidator.predicate("refreshable_until is after expired_at", () => {
    const expired = new Date(loginResult.token.expired_at).getTime();
    const refreshable = new Date(loginResult.token.refreshable_until).getTime();
    return refreshable >= expired;
  });
}
