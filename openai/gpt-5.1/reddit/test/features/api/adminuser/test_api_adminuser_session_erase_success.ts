import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate that an authenticated adminUser can invoke the admin session erase
 * API.
 *
 * ## Business goal
 *
 * Ensure the wiring between authentication (admin join) and the admin session
 * erase endpoint is correct: an adminUser can be created and the
 * api.functional.communityPlatform.adminUser.adminUsers.sessions.erase function
 * can be called with that admin’s username and some session id without type
 * issues. Because the current SDK does not provide any session-creation or
 * session-listing endpoint, this test does not attempt to verify actual session
 * invalidation, only that the happy-path call is executable from an
 * authenticated admin context.
 *
 * ## Steps
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join using a random, unique
 *    username and email so that uniqueness constraints on admin users are
 *    satisfied.
 * 2. Confirm that the join endpoint returns a valid authorized adminUser context
 *    (ICommunityPlatformAdminuser.IAuthorized) using typia.assert, and rely on
 *    the SDK to have attached the Authorization header to the provided
 *    connection.
 * 3. Call DELETE
 *    /communityPlatform/adminUser/adminUsers/{username}/sessions/{sessionId}
 *    via api.functional.communityPlatform.adminUser.adminUsers.sessions.erase
 *    using the newly created admin’s username and a randomly generated
 *    sessionId string.
 * 4. Assert that the call completes without throwing, which we interpret as a
 *    successful invocation from the client point of view. Since the response
 *    type is void and no session APIs are available, we cannot further validate
 *    behavioral side effects here.
 */
export async function test_api_adminuser_session_erase_success(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser via join
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Prepare a random session id for erase target
  const sessionId: string = RandomGenerator.alphaNumeric(24);

  // 3. Invoke the erase endpoint with the admin's username and the session id
  await api.functional.communityPlatform.adminUser.adminUsers.sessions.erase(
    connection,
    {
      username: authorized.username,
      sessionId,
    },
  );

  // 4. Basic predicate: reaching here means call did not throw from client POV
  TestValidator.predicate(
    "admin session erase call completes without client-side error",
    true,
  );
}
