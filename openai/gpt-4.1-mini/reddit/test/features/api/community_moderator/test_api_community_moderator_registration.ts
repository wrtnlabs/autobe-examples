import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community moderator user registration.
 *
 * This test validates that new community moderator users can be registered
 * through the join endpoint with valid credentials. It verifies the issuance of
 * JWT tokens for authenticated sessions starting from a new user context.
 */
export async function test_api_community_moderator_registration(
  connection: api.IConnection,
) {
  // Generate a unique and valid email for community moderator
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Define a plain text password
  const password = "Abcd1234!";

  // Prepare the request body
  const joinBody = {
    email: email,
    password: password,
  } satisfies IRedditCommunityCommunityModerator.IJoin;

  // Call the joinCommunityModerator API to register the new user
  const authorized: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: joinBody,
      },
    );

  // Assert the response structure and types
  typia.assert(authorized);

  // Validate email matches
  TestValidator.equals(
    "community moderator email matches input",
    authorized.email,
    email,
  );

  // Validate token presence and structure
  TestValidator.predicate(
    "community moderator token access is non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "community moderator token refresh is non-empty",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // Validate timestamps are ISO date-time strings
  TestValidator.predicate(
    "community moderator token expired_at is ISO date-time",
    typeof authorized.token.expired_at === "string" &&
      authorized.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "community moderator token refreshable_until is ISO date-time",
    typeof authorized.token.refreshable_until === "string" &&
      authorized.token.refreshable_until.length > 0,
  );

  // Validate id is UUID format
  TestValidator.predicate(
    "community moderator id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );

  // Validate is_email_verified is false upon registration
  TestValidator.equals(
    "community moderator is_email_verified is false after join",
    authorized.is_email_verified,
    false,
  );

  // Validate created_at and updated_at are ISO date-time strings
  TestValidator.predicate(
    "community moderator created_at is ISO date-time",
    typeof authorized.created_at === "string" &&
      authorized.created_at.length > 0,
  );

  TestValidator.predicate(
    "community moderator updated_at is ISO date-time",
    typeof authorized.updated_at === "string" &&
      authorized.updated_at.length > 0,
  );

  // Validate deleted_at is null or undefined (soft deletion timestamp)
  TestValidator.predicate(
    "community moderator deleted_at is null or undefined",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );
}
