import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test that newly registered contributor account has email_verified set to
 * false and validates the initial state of email verification requirement.
 *
 * This test validates the contributor account registration process by ensuring
 * that newly registered accounts are created with email_verified set to false.
 * This is a critical security feature that requires contributors to verify
 * their email address before they can post articles or comments.
 *
 * The test workflow:
 *
 * 1. Generate valid registration credentials (email, username, password)
 * 2. Register a new contributor account via the join endpoint
 * 3. Verify the response contains email_verified: false
 * 4. Verify the response contains valid JWT tokens (access and refresh)
 * 5. Verify the account_status is 'active' for a newly created account
 * 6. Confirm that created_at timestamp is set correctly
 * 7. Validate the response structure matches
 *    IDiscussionBoardContributor.IAuthorized
 */
export async function test_api_contributor_registration_email_verification_initial_state(
  connection: api.IConnection,
) {
  // Generate valid registration credentials with proper format
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "TestPassword123!"; // Valid password: 8+ chars with uppercase, lowercase, number, special char
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Register new contributor account
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email,
      username,
      password,
      ip: null,
      href,
      referrer,
    } satisfies IDiscussionBoardContributor.ICreate,
  });

  // Validate the response structure and type
  typia.assert(contributor);

  // Verify email_verified is false for newly registered account
  TestValidator.equals(
    "newly registered account should have email_verified set to false",
    contributor.email_verified,
    false,
  );

  // Verify account_status is 'active'
  TestValidator.equals(
    "newly registered account should have active status",
    contributor.account_status,
    "active",
  );

  // Verify the email matches what was registered
  TestValidator.equals(
    "registered email should match input email",
    contributor.email,
    email,
  );

  // Verify the username matches what was registered
  TestValidator.equals(
    "registered username should match input username",
    contributor.username,
    username,
  );

  // Verify JWT token is provided
  TestValidator.predicate(
    "access token should be provided",
    () => contributor.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be provided",
    () => contributor.token.refresh.length > 0,
  );

  // Verify token expiration dates are properly set
  TestValidator.predicate(
    "access token expiration should be set",
    () => new Date(contributor.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token refreshable_until should be set",
    () => new Date(contributor.token.refreshable_until) > new Date(),
  );

  // Verify timestamps are set
  TestValidator.predicate(
    "created_at should be set",
    () =>
      contributor.created_at &&
      new Date(contributor.created_at) instanceof Date,
  );

  TestValidator.predicate(
    "updated_at should be set",
    () =>
      contributor.updated_at &&
      new Date(contributor.updated_at) instanceof Date,
  );

  // Verify ID is a valid UUID
  TestValidator.predicate("contributor id should be a valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      contributor.id,
    ),
  );

  // Verify deleted_at is not set for active accounts
  TestValidator.predicate(
    "deleted_at should not be set for newly registered account",
    () =>
      contributor.deleted_at === null || contributor.deleted_at === undefined,
  );
}
