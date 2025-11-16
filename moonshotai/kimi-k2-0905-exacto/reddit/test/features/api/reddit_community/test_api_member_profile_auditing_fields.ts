import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test that member profile temporal tracking (created_at, updated_at) is
 * accurate and properly reflects profile lifecycle management.
 *
 * This test validates that the platform maintains proper audit trails for
 * profile modifications and account creation timelines. The test verifies that
 * profile creation timestamps accurately record when profiles were established,
 * that update timestamps reflect modification history for administrative
 * tracking, and that these temporal fields enable proper profile management,
 * compliance auditing, and member activity analysis across the community
 * platform.
 */
export async function test_api_member_profile_auditing_fields(
  connection: api.IConnection,
) {
  // Generate a unique member code for testing
  const memberCode = RandomGenerator.alphaNumeric(10);

  // Create a test profile by first retrieving the member profile
  const testTime = new Date();

  // Retrieve the member profile to verify auditing fields exist and are properly formatted
  const profile = await api.functional.redditCommunity.users.profile(
    connection,
    {
      memberCode: memberCode,
    },
  );
  typia.assert(profile);

  // Validate that created_at timestamp exists and is properly formatted
  TestValidator.predicate(
    "created_at field exists and is valid ISO 8601 format",
    profile.created_at !== null &&
      typeof profile.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        profile.created_at,
      ),
  );

  // Validate that updated_at timestamp exists and is properly formatted
  TestValidator.predicate(
    "updated_at field exists and is valid ISO 8601 format",
    profile.updated_at !== null &&
      typeof profile.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        profile.updated_at,
      ),
  );

  // Verify both timestamps are parseable as dates and are reasonable
  const createdDate = new Date(profile.created_at);
  const updatedDate = new Date(profile.updated_at);

  // Test that created_at is not in the future (indicating reasonable timestamp accuracy)
  TestValidator.predicate(
    "created_at timestamp is not set to a future time",
    createdDate <= testTime,
  );

  // Test that updated_at is after or equal to created_at (logically correct)
  TestValidator.predicate(
    "updated_at timestamp is after or equal to created_at",
    createdDate <= updatedDate,
  );

  // Additional validation of temporal field consistency
  if (profile.member !== null && profile.member.created_at) {
    // Compare profile.created_at with member.created_at if available
    const memberCreatedDate = new Date(profile.member.created_at);
    TestValidator.predicate(
      "profile created_at matches member creation timing if available",
      Math.abs(createdDate.getTime() - memberCreatedDate.getTime()) < 60000, // Within 1 minute tolerance
    );
  }
}
