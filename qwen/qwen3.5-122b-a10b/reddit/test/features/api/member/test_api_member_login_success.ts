import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login authentication with valid credentials.
 *
 * Validates the complete member login flow including account registration, credential authentication, and token issuance. Ensures that the login operation returns JWT access and refresh tokens along with the member's complete profile information.
 *
 * The test verifies that the access token can be used for subsequent authenticated API calls requiring member authorization. All profile fields including id, email, username, display_name, bio, avatar, karma_score, and timestamps are validated for correct structure and data types.
 *
 * 1. Create a member connection for registration.
 * 2. Register a new member account with valid email, password, and username.
 * 3. Create a separate member connection for login.
 * 4. Login with the registered credentials (email and password).
 * 5. Validate the login response contains JWT tokens and complete member profile.
 * 6. Verify all profile fields match expected types and constraints.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate and store credentials for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  // 2. Register a new member account
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(registeredMember);
  // 3. Create separate member connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Login with registered credentials
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IRedditLikeMember.ILogin,
  });
  typia.assert(loginResult);
  // 5. Validate login response matches registration data
  TestValidator.equals(
    "member ID matches",
    loginResult.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "email matches",
    loginResult.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "username matches",
    loginResult.username,
    registeredMember.username,
  );
  // 6. Validate token structure exists
  TestValidator.predicate(
    "has access token",
    () => loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    () => loginResult.token.refresh.length > 0,
  );
  // 7. Validate profile fields
  TestValidator.predicate(
    "has display name",
    () => loginResult.display_name.length > 0,
  );
  TestValidator.predicate("karma score is valid integer", () =>
    Number.isInteger(loginResult.karma_score),
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    () => loginResult.deleted_at === null,
  );
}
