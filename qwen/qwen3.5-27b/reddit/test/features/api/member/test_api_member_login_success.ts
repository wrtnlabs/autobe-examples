import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member authentication with valid email and password credentials.
 *
 * Validates the complete member authentication flow including account registration and login. Ensures that the system correctly validates credentials, creates authentication sessions, and returns proper authorization tokens along with member profile information.
 *
 * Special attention is given to verifying that the login response contains valid JWT tokens with expiration timestamps, the member information matches the registered account details, and the authentication process correctly handles the session creation.
 *
 * 1. Register a new member account with unique email, password, and username.
 * 2. Authenticate the member using the same credentials.
 * 3. Verify the login response contains valid tokens and member information.
 * 4. Validate that the member data matches the registration input.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Login with the registered credentials (reuse SAME password)
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInMember = await authorize_member_login(loginConnection, {
    body: {
      email: registeredMember.email,
      password, // Use the SAME password from registration
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.ILogin,
  });
  typia.assert(loggedInMember);
  // 3. Verify login response contains valid tokens
  TestValidator.predicate(
    "has access token",
    loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at",
    loggedInMember.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until",
    loggedInMember.token.refreshable_until.length > 0,
  );
  // 4. Validate member information matches registration
  TestValidator.equals(
    "email matches",
    loggedInMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "username matches",
    loggedInMember.username,
    registeredMember.username,
  );
  TestValidator.equals("id matches", loggedInMember.id, registeredMember.id);
  TestValidator.predicate(
    "has display name",
    loggedInMember.display_name.length > 0,
  );
  TestValidator.predicate(
    "karma is valid number",
    typeof loggedInMember.karma === "number",
  );
}
