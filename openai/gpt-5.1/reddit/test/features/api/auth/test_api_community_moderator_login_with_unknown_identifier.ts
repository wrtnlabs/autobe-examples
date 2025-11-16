import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Verify that community moderator login fails for an unknown identifier.
 *
 * Business intent
 *
 * - Ensure that POST /auth/communityModerator/login does not authenticate or
 *   create a session for credentials that do not match any existing community
 *   moderator account.
 * - Confirm that the system treats such attempts purely as failed logins, without
 *   issuing tokens.
 *
 * Scenario steps
 *
 * 1. Register a valid community moderator via POST /auth/communityModerator/join
 *    to ensure the platform has at least one real account in place.
 * 2. Generate an identifier (email) that is effectively guaranteed to be unknown
 *    to the system (distinct random email string) and a random password.
 * 3. Call POST /auth/communityModerator/login with this unknown identifier and
 *    password.
 * 4. Assert that the login attempt fails by verifying that the call throws an
 *    error using TestValidator.error.
 * 5. Do not attempt to inspect connection.headers or DB state; success is defined
 *    strictly by the absence of an authorized response for the unknown
 *    identifier.
 */
export async function test_api_community_moderator_login_with_unknown_identifier(
  connection: api.IConnection,
) {
  // 1. Register a valid community moderator via join.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const authorizedModerator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    authorizedModerator,
  );

  // 2. Prepare an unknown identifier (email) that does not correspond
  //    to the joined moderator, and a random password.
  const unknownEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Note: collision with joinBody.email is theoretically possible but
  // practically negligible in test context; the focus is on a value
  // not expected to exist in normal operation.

  const unknownLoginBody = {
    identifier: unknownEmail,
    password: RandomGenerator.alphaNumeric(24),
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  // 3. Call login with the unknown identifier and assert it fails.
  await TestValidator.error(
    "community moderator login must fail for unknown identifier",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: unknownLoginBody,
      });
    },
  );
}
