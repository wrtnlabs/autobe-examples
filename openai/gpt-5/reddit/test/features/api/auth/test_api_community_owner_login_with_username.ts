import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

/**
 * Authenticate a community owner with username and password.
 *
 * Flow:
 *
 * 1. Register a new community owner via POST /auth/communityOwner/join using
 *    ICommunityPlatformCommunityOwner.ICreate with compliant values (email,
 *    username, password, terms_accepted_at, privacy_accepted_at, and optional
 *    profile fields).
 * 2. Login via POST /auth/communityOwner/login using username + password only (no
 *    email) to explicitly validate username-based authentication.
 * 3. Validate response types with typia.assert and confirm the authenticated
 *    account refers to the same user id as the one created at join.
 * 4. If role is present, ensure it equals "communityOwner".
 *
 * Notes:
 *
 * - Never touch connection.headers. SDK manages tokens automatically.
 * - Avoid "satisfies any" for the login body since ILogin is defined as `any`.
 */
export async function test_api_community_owner_login_with_username(
  connection: api.IConnection,
) {
  // Prepare registration payload with valid constraints
  const username: string = RandomGenerator.alphaNumeric(12); // ^[A-Za-z0-9_]{3,20}$
  const password: string = RandomGenerator.alphaNumeric(12); // 8~64 characters

  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username,
    password,
    display_name: RandomGenerator.name(2),
    avatar_uri: `https://example.com/avatar/${username}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
    marketing_opt_in_at: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunityOwner.ICreate;

  const joined = await api.functional.auth.communityOwner.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformCommunityOwner.IAuthorized>(joined);

  // Login via username + password (explicitly no email)
  const loginBody = {
    username,
    password,
  }; // ILogin is any; avoid "satisfies any" per rules

  const authorized = await api.functional.auth.communityOwner.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityOwner.IAuthorized>(authorized);

  // Validate same user id across join and login
  TestValidator.equals(
    "login returns same user id as registered",
    authorized.id,
    joined.id,
  );

  // If role is present, it must be "communityOwner"
  if (authorized.role !== undefined) {
    TestValidator.equals(
      "authorized role equals communityOwner when present",
      authorized.role,
      "communityOwner",
    );
  }
}
