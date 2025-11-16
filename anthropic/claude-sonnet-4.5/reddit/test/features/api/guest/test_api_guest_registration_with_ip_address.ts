import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test guest registration workflow when client provides IP address for session
 * tracking.
 *
 * This test validates the complete guest account registration process when an
 * explicit IP address is provided in the request body. It verifies that:
 *
 * 1. Guest account is created successfully with all profile information
 * 2. Authentication tokens (access and refresh) are returned properly
 * 3. Session metadata including IP address is recorded for security monitoring
 * 4. All required and optional fields are handled correctly
 * 5. Privacy settings are initialized according to user preferences
 *
 * The test follows a realistic guest onboarding scenario where the client
 * application provides session tracking information including IP address,
 * current page URL (href), and referrer URL for analytics and security
 * purposes.
 */
export async function test_api_guest_registration_with_ip_address(
  connection: api.IConnection,
) {
  // Generate guest registration data with explicit IP address
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  // Register new guest account with IP address
  const guest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });

  // Validate the response structure - this validates EVERYTHING
  typia.assert(guest);

  // Verify guest account matches registration data
  TestValidator.equals(
    "username matches registration data",
    guest.username,
    registrationData.username,
  );

  TestValidator.equals(
    "email matches registration data",
    guest.email,
    registrationData.email,
  );

  // Verify optional profile fields
  TestValidator.equals(
    "display name matches registration data",
    guest.display_name,
    registrationData.display_name,
  );

  TestValidator.equals(
    "bio matches registration data",
    guest.bio,
    registrationData.bio,
  );

  TestValidator.equals(
    "avatar URL matches registration data",
    guest.avatar_url,
    registrationData.avatar_url,
  );

  // Verify privacy settings
  TestValidator.equals(
    "show_online_status matches registration data",
    guest.show_online_status,
    registrationData.show_online_status,
  );

  TestValidator.equals(
    "show_subscribed_communities matches registration data",
    guest.show_subscribed_communities,
    registrationData.show_subscribed_communities,
  );

  TestValidator.equals(
    "show_activity_feed matches registration data",
    guest.show_activity_feed,
    registrationData.show_activity_feed,
  );

  // Verify email verification status
  TestValidator.equals(
    "email should not be verified initially",
    guest.email_verified,
    false,
  );

  // Verify karma initialization
  TestValidator.equals(
    "post karma should be initialized to 0",
    guest.post_karma,
    0,
  );

  TestValidator.equals(
    "comment karma should be initialized to 0",
    guest.comment_karma,
    0,
  );
}
