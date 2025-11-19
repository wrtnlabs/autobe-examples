import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_authentication_response_structure(
  connection: api.IConnection,
) {
  // Generate test credentials with required complexity
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "TestPassword123!"; // Meets complexity: 8+ chars, uppercase, lowercase, number, special char

  // Create login request body with required session context
  const loginRequest = {
    email: testEmail,
    password: testPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  // Call moderator login endpoint
  const response: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginRequest,
    });

  // Validate complete response structure with comprehensive type checking
  typia.assert(response);

  // Verify moderator identity fields are properly populated
  TestValidator.predicate(
    "moderator ID is non-empty UUID",
    response.id.length > 0,
  );

  TestValidator.equals("email matches login email", response.email, testEmail);

  TestValidator.predicate(
    "username is non-empty and follows pattern",
    response.username.length > 0,
  );

  // Verify account status fields
  TestValidator.predicate(
    "email_verified is boolean type",
    typeof response.email_verified === "boolean",
  );

  TestValidator.predicate(
    "account_status is one of valid enum values",
    ["active", "suspended", "deleted"].includes(response.account_status),
  );

  TestValidator.equals(
    "moderation_tier is constant 'full'",
    response.moderation_tier,
    "full",
  );

  // Verify timestamp fields exist and are non-empty
  TestValidator.predicate(
    "created_at timestamp is non-empty",
    response.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp is non-empty",
    response.updated_at.length > 0,
  );

  // Verify optional deleted_at field behavior
  if (response.account_status === "active") {
    TestValidator.equals(
      "deleted_at is null for active accounts",
      response.deleted_at,
      null,
    );
  } else {
    TestValidator.predicate(
      "deleted_at is present for non-active accounts",
      response.deleted_at !== null && response.deleted_at !== undefined,
    );
  }

  // Verify last_login_at is updated to current time upon successful authentication
  TestValidator.predicate(
    "last_login_at is set and non-empty",
    response.last_login_at !== null &&
      response.last_login_at !== undefined &&
      response.last_login_at.length > 0,
  );

  // Verify token object contains all required fields
  TestValidator.predicate(
    "access token is non-empty JWT string",
    response.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty JWT string",
    response.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at timestamp is non-empty",
    response.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refreshable_until timestamp is non-empty",
    response.token.refreshable_until.length > 0,
  );

  // Verify token expiration logic: access token expires before refresh token
  TestValidator.predicate(
    "access token expiration is before refresh token expiration",
    new Date(response.token.expired_at) <
      new Date(response.token.refreshable_until),
  );
}
