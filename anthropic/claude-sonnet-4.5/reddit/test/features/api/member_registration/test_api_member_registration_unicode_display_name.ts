import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test member registration with Unicode display_name for international users.
 *
 * This test validates that the registration system properly handles Unicode
 * characters in the display_name field, including Chinese characters, Arabic
 * text, and emoji. It ensures that international users can register with
 * display names in their native languages without data corruption.
 *
 * Steps:
 *
 * 1. Create registration data with Unicode display_name (Chinese + Arabic + emoji)
 * 2. Call the member registration API
 * 3. Verify successful registration
 * 4. Validate that display_name is returned with all Unicode characters intact
 */
export async function test_api_member_registration_unicode_display_name(
  connection: api.IConnection,
) {
  // Prepare registration data with Unicode display_name
  const unicodeDisplayName = "李明 محمد 😊🌟";

  const registrationData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: unicodeDisplayName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  // Register new member with Unicode display_name
  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });

  // Validate the response structure
  typia.assert(authorizedMember);

  // Verify that the Unicode display_name is preserved correctly
  TestValidator.equals(
    "display_name should preserve Unicode characters",
    authorizedMember.display_name,
    unicodeDisplayName,
  );

  // Verify other registration data is correct
  TestValidator.equals(
    "username should match",
    authorizedMember.username,
    registrationData.username,
  );

  TestValidator.equals(
    "email should match",
    authorizedMember.email,
    registrationData.email,
  );

  // Verify authentication token is issued
  TestValidator.predicate(
    "access token should be present",
    authorizedMember.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present",
    authorizedMember.token.refresh.length > 0,
  );
}
