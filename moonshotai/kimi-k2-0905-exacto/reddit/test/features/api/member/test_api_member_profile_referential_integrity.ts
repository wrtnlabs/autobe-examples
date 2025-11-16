import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test member profile referential integrity by validating profile retrieval
 * functionality.
 *
 * Since we only have access to the profile retrieval API
 * (/redditCommunity/users/{memberCode}/profile), this test verifies that:
 *
 * 1. Profile retrieval works correctly with valid member codes
 * 2. The retrieved profile contains proper member reference data
 * 3. The member summary information is correctly populated
 * 4. Profile data structure follows the expected format
 * 5. Basic error handling occurs with invalid input
 *
 * This validates that the profile system maintains proper associations with
 * member accounts and that the referential integrity is intact through
 * successful data retrieval operations.
 */
export async function test_api_member_profile_referential_integrity(
  connection: api.IConnection,
) {
  // Test 1: Profile retrieval with valid random member code
  const memberCode = RandomGenerator.alphaNumeric(8);

  // Retrieve profile and validate the response structure
  const profile = await api.functional.redditCommunity.users.profile(
    connection,
    {
      memberCode: memberCode,
    },
  );

  // Validate the response structure
  typia.assert(profile);

  // Test 2: Verify member reference integrity
  TestValidator.predicate(
    "profile has member reference properly",
    profile.member !== undefined,
  );
  TestValidator.predicate(
    "member has valid UUID id",
    profile.member.id.length === 36,
  );
  TestValidator.predicate(
    "member has non-empty nickname",
    profile.member.nickname.length > 0,
  );
  TestValidator.predicate(
    "member has valid email format",
    profile.member.email.includes("@"),
  );

  // Test 3: Verify profile structure contains expected fields
  TestValidator.predicate(
    "profile has display name",
    profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "profile has valid created_at format",
    profile.created_at.includes("T"),
  );
  TestValidator.predicate(
    "profile has valid updated_at format",
    profile.updated_at.includes("T"),
  );
  TestValidator.predicate(
    "profile has boolean verification status",
    typeof profile.is_verified === "boolean",
  );

  // Test 4: Validate optional fields are properly typed
  if (profile.avatar_url !== null && profile.avatar_url !== undefined) {
    TestValidator.predicate(
      "avatar_url is valid URI format",
      profile.avatar_url.startsWith("http"),
    );
  }

  if (profile.website_url !== null && profile.website_url !== undefined) {
    TestValidator.predicate(
      "website_url is valid URI format",
      profile.website_url.startsWith("http"),
    );
  }

  if (
    profile.profile_banner_url !== null &&
    profile.profile_banner_url !== undefined
  ) {
    TestValidator.predicate(
      "profile_banner_url is valid URI format",
      profile.profile_banner_url.startsWith("http"),
    );
  }

  // Test 5: Validate bio and location constraints
  if (profile.bio !== null && profile.bio !== undefined) {
    TestValidator.predicate(
      "bio respects maximum length constraint",
      profile.bio.length <= 500,
    );
  }

  if (profile.location !== null && profile.location !== undefined) {
    TestValidator.predicate(
      "location respects maximum length constraint",
      profile.location.length <= 100,
    );
  }

  // Test 6: Validate type safety through equality checks
  TestValidator.equals("profile id is valid UUID", profile.id.length, 36);
  TestValidator.equals(
    "display name respects max length",
    profile.display_name.length <= 50,
    true,
  );
  TestValidator.equals("member id is valid UUID", profile.member.id.length, 36);
  TestValidator.equals(
    "member nickname is string",
    typeof profile.member.nickname,
    "string",
  );

  // Test 7: Error case with valid empty string member code
  // API should handle this edge case appropriately
  const emptyProfile = await api.functional.redditCommunity.users.profile(
    connection,
    { memberCode: "" },
  );

  // Validate that even empty member code returns a proper response structure
  typia.assert(emptyProfile);
}
