import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

export async function test_api_registered_user_empty_activity_history(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user with no prior activity
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    username: RandomGenerator.alphabets(12), // Generate unique username
    email: userEmail,
    password: "TestPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData,
    });
  typia.assert(registeredUser);

  // Step 2: Validate user registration was successful
  TestValidator.predicate(
    "user ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registeredUser.id,
    ),
  );

  // Step 3: Retrieve activities for the newly registered user (should be empty)
  const activitiesResponse: IPageIRedditPlatformUserActivity =
    await api.functional.redditPlatform.registeredUser.users.activities.index(
      connection,
      {
        userId: registeredUser.id,
      },
    );
  typia.assert(activitiesResponse);

  // Step 4: Validate empty activity response structure
  TestValidator.equals(
    "activities data should be empty array",
    activitiesResponse.data,
    [],
  );

  // Step 5: Validate pagination metadata for empty state
  TestValidator.equals(
    "pagination current page should be 0",
    activitiesResponse.pagination.current,
    0,
  );

  TestValidator.predicate(
    "pagination limit should be positive number",
    activitiesResponse.pagination.limit > 0,
  );

  TestValidator.equals(
    "pagination total records should be 0 for new user",
    activitiesResponse.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination total pages should be 0",
    activitiesResponse.pagination.pages,
    0,
  );

  // Step 6: Verify user authentication is valid
  TestValidator.predicate(
    "user authentication token should exist",
    registeredUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "user should have active account status",
    registeredUser.accountStatus === "active",
  );

  // Step 7: Verify user has no activity history (karma score should be 0)
  TestValidator.equals(
    "new user should have zero karma score",
    registeredUser.karmaScore,
    0,
  );

  // Step 8: Test multiple activity retrieval calls to ensure consistency
  const secondActivityCheck: IPageIRedditPlatformUserActivity =
    await api.functional.redditPlatform.registeredUser.users.activities.index(
      connection,
      {
        userId: registeredUser.id,
      },
    );
  typia.assert(secondActivityCheck);

  // Step 9: Verify consistent empty state across multiple calls
  TestValidator.equals(
    "consistent empty data across multiple calls",
    activitiesResponse.data.length,
    secondActivityCheck.data.length,
  );

  TestValidator.equals(
    "consistent pagination records across calls",
    activitiesResponse.pagination.records,
    secondActivityCheck.pagination.records,
  );

  // Step 10: Validate activity summary structure would be empty for new user
  TestValidator.predicate(
    "empty activity data confirms no user engagement",
    activitiesResponse.data.length === 0 &&
      activitiesResponse.pagination.records === 0,
  );
}
