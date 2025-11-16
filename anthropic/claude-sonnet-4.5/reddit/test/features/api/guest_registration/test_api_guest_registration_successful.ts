import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test successful guest account registration workflow.
 *
 * Validates that a new guest user can register by providing valid registration
 * data including username, email, password, and session metadata. Verifies that
 * the operation returns a complete IRedditCommunityGuest.IAuthorized response
 * containing the guest's profile information and JWT tokens.
 *
 * The test ensures:
 *
 * 1. Guest account is created successfully with all required fields
 * 2. JWT tokens (access and refresh) are issued and properly formatted
 * 3. Token expiration timestamps are valid and future-dated
 * 4. Karma scores are initialized to 0 for new accounts
 * 5. Privacy settings have appropriate default values
 * 6. Email verification status is false for new registrations
 */
export async function test_api_guest_registration_successful(
  connection: api.IConnection,
) {
  // Generate random registration data following all constraints
  const registrationData = {
    username: RandomGenerator.alphaNumeric(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<20>
      >(),
    ),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<8> & tags.Maximum<16>
      >(),
    ),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  // Call guest registration API
  const authorizedGuest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });

  // Validate response structure - this validates ALL type aspects including timestamps
  typia.assert(authorizedGuest);

  // Validate token expiration timestamps are in the future (business logic)
  const expiredAt = new Date(authorizedGuest.token.expired_at);
  const refreshableUntil = new Date(authorizedGuest.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expiration should be in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshableUntil > now,
  );

  // Verify profile data matches registration input
  TestValidator.equals(
    "username should match registration input",
    authorizedGuest.username,
    registrationData.username,
  );
  TestValidator.equals(
    "email should match registration input",
    authorizedGuest.email,
    registrationData.email,
  );

  // Verify karma scores are initialized to 0 (business logic)
  TestValidator.equals(
    "post karma should be initialized to 0",
    authorizedGuest.post_karma,
    0,
  );
  TestValidator.equals(
    "comment karma should be initialized to 0",
    authorizedGuest.comment_karma,
    0,
  );

  // Verify privacy settings (business logic)
  TestValidator.equals(
    "show_online_status should match input",
    authorizedGuest.show_online_status,
    registrationData.show_online_status,
  );
  TestValidator.equals(
    "show_subscribed_communities should match input",
    authorizedGuest.show_subscribed_communities,
    registrationData.show_subscribed_communities,
  );
  TestValidator.equals(
    "show_activity_feed should match input",
    authorizedGuest.show_activity_feed,
    registrationData.show_activity_feed,
  );

  // Verify email verification status for new account (business logic)
  TestValidator.equals(
    "email_verified should be false for new account",
    authorizedGuest.email_verified,
    false,
  );
}
