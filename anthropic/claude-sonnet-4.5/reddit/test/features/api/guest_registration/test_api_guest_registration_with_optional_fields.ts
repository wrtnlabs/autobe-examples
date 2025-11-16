import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test guest registration with all optional profile fields provided.
 *
 * This test validates that when a guest registers with all optional fields
 * (display_name, bio, avatar_url, and custom privacy settings), the system
 * correctly stores and returns these values in the response. It ensures that
 * optional profile customization works during the registration process.
 *
 * Steps:
 *
 * 1. Generate valid registration data with all required fields
 * 2. Add all optional fields with meaningful test values
 * 3. Call the guest registration API
 * 4. Validate response contains correct profile data
 * 5. Verify all optional fields are preserved
 * 6. Confirm authentication tokens are issued
 * 7. Check privacy settings match provided values
 */
export async function test_api_guest_registration_with_optional_fields(
  connection: api.IConnection,
) {
  // Create registration request with ALL optional fields
  const registrationData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: true,
    show_subscribed_communities: true,
    show_activity_feed: false,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  // Call guest registration API
  const guest = await api.functional.auth.guest.join(connection, {
    body: registrationData,
  });

  // Validate response structure - this validates ALL types perfectly
  typia.assert(guest);

  // Verify required fields match input
  TestValidator.equals(
    "username matches",
    guest.username,
    registrationData.username,
  );
  TestValidator.equals("email matches", guest.email, registrationData.email);
  TestValidator.equals(
    "email not verified initially",
    guest.email_verified,
    false,
  );

  // Verify optional display_name is preserved
  TestValidator.equals(
    "display_name matches provided value",
    guest.display_name,
    registrationData.display_name,
  );

  // Verify bio content is preserved
  TestValidator.equals(
    "bio matches provided value",
    guest.bio,
    registrationData.bio,
  );

  // Verify avatar_url is stored correctly
  TestValidator.equals(
    "avatar_url matches provided value",
    guest.avatar_url,
    registrationData.avatar_url,
  );

  // Verify custom privacy settings override defaults
  TestValidator.equals(
    "show_online_status custom setting",
    guest.show_online_status,
    true,
  );
  TestValidator.equals(
    "show_subscribed_communities custom setting",
    guest.show_subscribed_communities,
    true,
  );
  TestValidator.equals(
    "show_activity_feed custom setting",
    guest.show_activity_feed,
    false,
  );

  // Verify initial karma values are zero
  TestValidator.equals("post_karma starts at zero", guest.post_karma, 0);
  TestValidator.equals("comment_karma starts at zero", guest.comment_karma, 0);
}
