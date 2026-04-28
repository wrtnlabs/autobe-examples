import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verify member login with valid credentials returns proper authorization response.
 *
 * Tests the complete authentication flow where an existing member with a valid email and password logs into the platform. The test registers a new member first to guarantee a valid account exists, then authenticates using the same credentials. The response is expected to contain the member's profile information and a valid pair of JWT authorization tokens for session management.
 *
 * Validates that the login response includes the member's global identity (id, email, display_name) and authorization token structure (access token, refresh token, expiration timestamps). This ensures the session establishment logic works correctly upon successful credential verification.
 *
 * 1. Register a new member account with unique email and password.
 * 2. Attempt login with the same email and password used during registration.
 * 3. Validate that the response contains correct member identity matching the join data.
 * 4. Validate that authorization tokens are present with valid structure.
 */
export async function test_api_member_login_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail: string = typia.random<string & tags.Format<"email">>();
  const joinPassword: string = RandomGenerator.alphaNumeric(16);
  const joinDisplayName: string = RandomGenerator.name();
  const joinedMember = await authorize_member_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      display_name: joinDisplayName,
    },
  });
  typia.assert(joinedMember);
  // 2. Login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: joinEmail,
    password: joinPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmPlatformMember.ILogin;
  const authorizedMember = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(authorizedMember);
  // 3. Validate member identity matches join data
  TestValidator.equals(
    "email matches joined member",
    authorizedMember.email,
    joinEmail,
  );
  TestValidator.equals(
    "display_name matches joined member",
    authorizedMember.display_name,
    joinDisplayName,
  );
  // 4. Validate authorization token was set in connection headers
  TestValidator.predicate(
    "authorization header set",
    loginConnection.headers !== undefined &&
      loginConnection.headers!["Authorization"] !== undefined,
  );
}
