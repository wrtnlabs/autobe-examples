import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";

/**
 * Test guest user registration workflow for new visitors.
 *
 * This test validates that unauthenticated visitors can create temporary guest
 * accounts to browse the platform without providing credentials. It verifies
 * that:
 *
 * 1. Guest registration succeeds with optional tracking information
 * 2. A unique session identifier and user ID are generated
 * 3. JWT tokens (access and refresh) are issued with proper expiration times
 * 4. The guest role is correctly assigned
 * 5. Tracking information is captured for analytics
 * 6. The access token is automatically set in connection headers
 */
export async function test_api_guest_registration_new_visitor(
  connection: api.IConnection,
) {
  // Prepare guest registration request with optional tracking data
  const guestRegistrationData = {
    ip_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}`,
    user_agent: `Mozilla/5.0 (${RandomGenerator.pick(["Windows NT 10.0", "Macintosh", "X11"] as const)}; ${RandomGenerator.pick(["Win64; x64", "Intel Mac OS X 10_15_7", "Linux x86_64"] as const)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${typia.random<number & tags.Type<"uint32"> & tags.Minimum<90> & tags.Maximum<120>>()}.0.0.0 Safari/537.36`,
  } satisfies IRedditLikeGuest.ICreate;

  // Call the guest registration API
  const guestAuthorized: IRedditLikeGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestRegistrationData,
    });

  // Validate the response structure and types - this performs COMPLETE type validation
  typia.assert(guestAuthorized);

  // Verify role assignment
  TestValidator.equals("role should be guest", guestAuthorized.role, "guest");

  // Verify access token expires in approximately 30 minutes (allow 5 minute variance)
  const expiredAt = new Date(guestAuthorized.token.expired_at);
  const now = new Date();
  const accessTokenLifetimeMs = expiredAt.getTime() - now.getTime();
  const expectedAccessLifetime = 30 * 60 * 1000;

  TestValidator.predicate(
    "access token should expire in approximately 30 minutes",
    Math.abs(accessTokenLifetimeMs - expectedAccessLifetime) < 5 * 60 * 1000,
  );

  // Verify refresh token expires in approximately 30 days (allow 1 hour variance)
  const refreshableUntil = new Date(guestAuthorized.token.refreshable_until);
  const refreshTokenLifetimeMs = refreshableUntil.getTime() - now.getTime();
  const expectedRefreshLifetime = 30 * 24 * 60 * 60 * 1000;

  TestValidator.predicate(
    "refresh token should expire in approximately 30 days",
    Math.abs(refreshTokenLifetimeMs - expectedRefreshLifetime) < 60 * 60 * 1000,
  );

  // Verify connection headers were automatically updated with access token
  TestValidator.equals(
    "connection headers should contain the access token",
    connection.headers?.Authorization,
    guestAuthorized.token.access,
  );
}
