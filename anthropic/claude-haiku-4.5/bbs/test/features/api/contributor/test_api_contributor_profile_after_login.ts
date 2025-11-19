import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test profile retrieval using authentication token obtained through login
 * operation.
 *
 * This test validates the complete authentication workflow:
 *
 * 1. Register a new contributor account with required credentials (email,
 *    username, password)
 * 2. Authenticate using login endpoint with the registered email and password
 * 3. Retrieve the contributor's profile using the obtained authentication token
 * 4. Verify that profile data matches registered account information
 * 5. Verify that lastLoginAt timestamp is updated to current time after login
 * 6. Validate all profile fields are present and correctly typed
 *
 * This ensures authentication produces valid tokens, tokens are properly used
 * for authenticated requests, and profile endpoint returns accurate user
 * information.
 */
export async function test_api_contributor_profile_after_login(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "TestPass123!";

  const joinResponse = await api.functional.auth.contributor.join(connection, {
    body: {
      email,
      username,
      password,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(joinResponse);

  TestValidator.predicate(
    "join response contains authorization token",
    joinResponse.token !== null && joinResponse.token !== undefined,
  );

  const joinToken = joinResponse.token;
  TestValidator.predicate(
    "access token is present",
    joinToken.access !== null && joinToken.access.length > 0,
  );

  // Step 2: Create new connection and login with registered credentials
  const loginConnection: api.IConnection = { ...connection, headers: {} };

  const loginResponse = await api.functional.auth.contributor.login(
    loginConnection,
    {
      body: {
        email,
        password,
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies IDiscussionBoardContributor.ILogin,
    },
  );
  typia.assert(loginResponse);

  TestValidator.equals(
    "login response email matches registered email",
    loginResponse.email,
    email,
  );

  TestValidator.equals(
    "login response username matches registered username",
    loginResponse.username,
    username,
  );

  TestValidator.predicate(
    "login response contains valid token",
    loginResponse.token !== null && loginResponse.token !== undefined,
  );

  // Step 3: Retrieve profile using authenticated connection
  const profileResponse =
    await api.functional.discussionBoard.contributor.profile.at(
      loginConnection,
    );
  typia.assert(profileResponse);

  // Step 4: Verify profile data matches account information
  TestValidator.equals(
    "profile email matches registered email",
    profileResponse.email,
    email,
  );

  TestValidator.equals(
    "profile username matches registered username",
    profileResponse.username,
    username,
  );

  TestValidator.equals(
    "profile account status is active",
    profileResponse.accountStatus,
    "active",
  );

  // Step 5: Verify lastLoginAt is updated after login
  TestValidator.predicate(
    "profile lastLoginAt is defined",
    profileResponse.lastLoginAt !== null &&
      profileResponse.lastLoginAt !== undefined,
  );

  const lastLoginTimestamp = profileResponse.lastLoginAt;
  if (lastLoginTimestamp) {
    const lastLoginDate = new Date(lastLoginTimestamp);
    const now = new Date();
    const timeDifferenceSeconds =
      (now.getTime() - lastLoginDate.getTime()) / 1000;

    TestValidator.predicate(
      "lastLoginAt is recent (within 30 seconds)",
      timeDifferenceSeconds >= 0 && timeDifferenceSeconds <= 30,
    );
  }

  // Step 6: Verify all profile fields are present and valid
  TestValidator.predicate(
    "profile id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profileResponse.id,
    ),
  );

  TestValidator.predicate(
    "profile createdAt is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profileResponse.createdAt),
  );

  TestValidator.predicate(
    "profile updatedAt is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profileResponse.updatedAt),
  );
}
