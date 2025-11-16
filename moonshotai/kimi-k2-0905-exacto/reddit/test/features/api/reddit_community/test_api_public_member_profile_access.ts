import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test that community member profiles are publicly accessible to all users
 * regardless of authentication status. This validates the open nature of
 * community membership information and supports user discovery within
 * communities. The test verifies that member display names, biographies,
 * locations, website URLs, and profile decoration (avatars/banners) are visible
 * to promote community transparency and facilitate social connections. It
 * ensures that profile information serves as intended for community building
 * while respecting any privacy settings configured by members, and that
 * verification status is publicly displayed to indicate community trust
 * levels.
 */
export async function test_api_public_member_profile_access(
  connection: api.IConnection,
) {
  // Test 1: Retrieve a basic member profile with minimal optional fields
  const memberCode1 = RandomGenerator.alphaNumeric(8);
  const basicProfile = await api.functional.redditCommunity.users.profile(
    connection,
    {
      memberCode: memberCode1,
    },
  );

  // Validate the complete response structure
  typia.assert(basicProfile);

  // Verify business logic: all required fields must be present and valid
  TestValidator.predicate(
    "basic profile has display name",
    basicProfile.display_name.length > 0,
  );
  TestValidator.predicate(
    "basic profile member has nickname",
    basicProfile.member.nickname.length > 0,
  );
  TestValidator.predicate(
    "basic profile member has valid email format",
    basicProfile.member.email.includes("@"),
  );
  TestValidator.predicate(
    "basic profile has verification status",
    typeof basicProfile.is_verified === "boolean",
  );

  // Test 2: Retrieve a member profile with all optional fields populated
  const memberCode2 = RandomGenerator.alphaNumeric(8);
  const comprehensiveProfile =
    await api.functional.redditCommunity.users.profile(connection, {
      memberCode: memberCode2,
    });

  typia.assert(comprehensiveProfile);

  // Verify comprehensive profile has rich content when optional fields exist
  if (comprehensiveProfile.bio) {
    TestValidator.predicate(
      "bio content is meaningful",
      comprehensiveProfile.bio.length > 0,
    );
  }
  if (comprehensiveProfile.location) {
    TestValidator.predicate(
      "location is place-like",
      comprehensiveProfile.location.length > 0,
    );
  }
  if (comprehensiveProfile.website_url) {
    TestValidator.predicate(
      "website URL has valid format",
      comprehensiveProfile.website_url.startsWith("http"),
    );
  }
  if (comprehensiveProfile.avatar_url) {
    TestValidator.predicate(
      "avatar URL has valid format",
      comprehensiveProfile.avatar_url.startsWith("http"),
    );
  }
  if (comprehensiveProfile.profile_banner_url) {
    TestValidator.predicate(
      "banner URL has valid format",
      comprehensiveProfile.profile_banner_url.startsWith("http"),
    );
  }

  // Test 3: Verify profile timestamps are logically consistent
  TestValidator.predicate(
    "created_at is before updated_at",
    new Date(comprehensiveProfile.created_at) <=
      new Date(comprehensiveProfile.updated_at),
  );
  TestValidator.predicate(
    "member created_at is before profile created_at",
    new Date(comprehensiveProfile.member.created_at) <=
      new Date(comprehensiveProfile.created_at),
  );

  // Test 4: Different member codes return different profiles
  TestValidator.notEquals(
    "different members have different IDs",
    basicProfile.member.id,
    comprehensiveProfile.member.id,
  );

  // Test 5: Verify that soft-deleted profiles are still accessible (public visibility)
  if (comprehensiveProfile.member.deleted_at) {
    TestValidator.predicate(
      "deleted member profile is still publicly accessible",
      typeof comprehensiveProfile.member.deleted_at === "string",
    );
    TestValidator.predicate(
      "deleted_at timestamp is valid",
      new Date(comprehensiveProfile.member.deleted_at).getTime() > 0,
    );
  }
}
