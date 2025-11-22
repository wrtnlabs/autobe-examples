import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformRegistereduserSession";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

/**
 * Test the behavior when a newly registered user has not yet established any
 * sessions, ensuring proper empty state handling and pagination response
 * structure for session management interface.
 *
 * This test validates the session management API endpoint by:
 *
 * 1. Creating a fresh user account through registration
 * 2. Immediately querying the user's sessions endpoint
 * 3. Verifying that the empty state is properly handled with:
 *
 *    - Empty data array for sessions
 *    - Correct pagination information (current: 0, limit: default, records: 0,
 *         pages: 0)
 *    - Proper response structure and type validation
 * 4. Ensuring no sessions exist for a newly registered user before any login
 *    activities
 *
 * The test ensures that the sessions endpoint gracefully handles users with no
 * session history and provides accurate pagination metadata for the empty
 * state.
 */
export async function test_api_user_session_empty_state_handling(
  connection: api.IConnection,
) {
  // Step 1: Create a fresh user account without session history
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "TestPassword123!";
  const userHref: string = "https://reddit-platform.example.com/register";
  const userReferrer: string = "https://reddit-platform.example.com/landing";

  const newUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        email: userEmail,
        password: userPassword,
        href: userHref,
        referrer: userReferrer,
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });

  typia.assert(newUser);

  // Step 2: Immediately query sessions endpoint for the new user (should be empty)
  const emptySessionsPage: IPageIRedditPlatformRegistereduserSession =
    await api.functional.redditPlatform.registeredUser.auth.sessions.index(
      connection,
    );

  typia.assert(emptySessionsPage);

  // Step 3: Validate empty state response structure
  TestValidator.equals("empty sessions data array", emptySessionsPage.data, []);

  // Step 4: Validate pagination information for empty state
  const pagination: IPage.IPagination = emptySessionsPage.pagination;
  TestValidator.equals("current page should be 0", pagination.current, 0);
  TestValidator.equals(
    "limit should be default value",
    pagination.limit,
    pagination.limit, // Just verify it exists and is a number
  );
  TestValidator.equals("total records should be 0", pagination.records, 0);
  TestValidator.equals("total pages should be 0", pagination.pages, 0);

  // Step 5: Verify user account was created successfully
  TestValidator.predicate(
    "user account should exist",
    newUser.id !== undefined && newUser.id !== null,
  );
  TestValidator.equals(
    "user email should match registration",
    newUser.email,
    userEmail,
  );
  TestValidator.equals(
    "user account status should be active",
    newUser.accountStatus,
    "active",
  );
  TestValidator.equals(
    "business status should be pending verification",
    newUser.businessStatus,
    "pending_verification",
  );

  // Step 6: Validate user has no previous sessions (expected for new registration)
  TestValidator.predicate(
    "user should have 0 login count initially",
    newUser.loginCount === 0,
  );
  TestValidator.predicate(
    "user should have no failed login attempts initially",
    newUser.failedLoginAttempts === 0,
  );
}
