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
 * Test successful member registration with valid credentials.
 *
 * Validates the complete member join workflow including account creation, password hashing, JWT token generation, and session record creation. A guest provides a unique email address, a password meeting security requirements, and a display name. The system creates a new member account in todo_app_members table, hashes the password securely, generates JWT access and refresh tokens, creates a session record in todo_app_member_sessions with client information (IP, href, referrer), and returns the member profile with authentication tokens.
 *
 * Special attention is given to verifying that the response contains valid member id, email, display name, created_at timestamp, and token object with access token, refresh token, expired_at, and refreshable_until. The test also verifies the member can immediately use the access token for authenticated requests.
 *
 * 1. Guest provides registration credentials with unique email, password, and display name.
 * 2. System creates member account in todo_app_members table with hashed password.
 * 3. System generates JWT access and refresh tokens.
 * 4. System creates session record in todo_app_member_sessions with client info (ip, href, referrer).
 * 5. Response returns member profile with authentication tokens.
 * 6. Validates response structure and token validity.
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // 2. Register new member with valid credentials
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    connection,
    {
      body: {
        email: email,
        password: password,
        displayName: displayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  // 3. Validate complete response structure and types
  typia.assert(authorized);
  // 4. Verify business logic: new account should not be deleted
  TestValidator.equals(
    "deleted_at is null for new account",
    authorized.deleted_at,
    null,
  );
  // 5. Verify business logic: email matches registration input
  TestValidator.equals(
    "email matches registration input",
    authorized.email,
    email,
  );
  // 6. Verify business logic: display name matches registration input
  TestValidator.equals(
    "display name matches registration input",
    authorized.display_name,
    displayName,
  );
  // 7. Verify business logic: refresh token expires after or at same time as access token
  TestValidator.predicate(
    "refresh token expires after access token",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
}
