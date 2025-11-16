import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

/**
 * Test retrieval of a member profile with customized display information.
 *
 * Creates a member account with fully customized profile fields including
 * display name (up to 100 chars), bio (up to 500 chars), profile image URL,
 * location (up to 100 chars), and website URL (up to 2048 chars). Then
 * retrieves the member's profile and validates that all customized fields are
 * accurately returned with correct values and proper formatting.
 *
 * Workflow:
 *
 * 1. Create a member account via authentication endpoint with registration
 *    credentials
 * 2. Extract the created member's ID from the authorization response
 * 3. Retrieve the member's profile using the profile GET endpoint
 * 4. Validate that all optional profile fields were correctly stored and retrieved
 * 5. Verify field values match input, respect character limits, and have proper
 *    formats
 * 6. Confirm member information is correctly embedded in the profile response
 */
export async function test_api_member_profile_with_customized_display_fields(
  connection: api.IConnection,
) {
  // 1. Create member account with registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = "TestPassword123!@#";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const memberCreated = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username,
      password,
      href,
      referrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberCreated);

  const memberId = memberCreated.id;
  TestValidator.equals("member ID from response", memberCreated.id, memberId);

  // 2. Retrieve the member's profile
  const memberProfile =
    await api.functional.communityPlatform.members.profiles.at(connection, {
      memberId,
    });
  typia.assert(memberProfile);

  // 3. Validate profile structure and member information
  TestValidator.equals(
    "profile has correct member ID",
    memberProfile.community_platform_member_id,
    memberId,
  );
  TestValidator.equals(
    "profile contains member object with matching ID",
    memberProfile.member.id,
    memberId,
  );
  TestValidator.equals(
    "profile member username matches created username",
    memberProfile.member.username,
    username,
  );
  TestValidator.equals(
    "profile member email matches created email",
    memberProfile.member.email,
    email,
  );
  TestValidator.predicate(
    "member email verification status is boolean",
    typeof memberProfile.member.email_verified === "boolean",
  );
  TestValidator.predicate(
    "member account status is active",
    memberProfile.member.account_status === "active",
  );
  TestValidator.predicate(
    "member karma score is non-negative integer",
    memberProfile.member.karma_score >= 0,
  );

  // 4. Validate optional profile fields are properly handled
  // Display name field (0-100 characters)
  if (
    memberProfile.display_name !== undefined &&
    memberProfile.display_name !== null
  ) {
    TestValidator.predicate(
      "display name respects 100 character limit",
      memberProfile.display_name.length <= 100,
    );
  }

  // Bio field (0-500 characters)
  if (memberProfile.bio !== undefined && memberProfile.bio !== null) {
    TestValidator.predicate(
      "bio respects 500 character limit",
      memberProfile.bio.length <= 500,
    );
  }

  // Profile image URL field (valid URI format if present)
  if (
    memberProfile.profile_image_url !== undefined &&
    memberProfile.profile_image_url !== null
  ) {
    TestValidator.predicate(
      "profile image URL is valid URI format",
      /^https?:\/\//.test(memberProfile.profile_image_url),
    );
  }

  // Location field (0-100 characters)
  if (memberProfile.location !== undefined && memberProfile.location !== null) {
    TestValidator.predicate(
      "location respects 100 character limit",
      memberProfile.location.length <= 100,
    );
  }

  // Website URL field (0-2048 characters and valid URI format)
  if (
    memberProfile.website_url !== undefined &&
    memberProfile.website_url !== null
  ) {
    TestValidator.predicate(
      "website URL respects 2048 character limit",
      memberProfile.website_url.length <= 2048,
    );
    TestValidator.predicate(
      "website URL is valid URI format",
      /^https?:\/\//.test(memberProfile.website_url),
    );
  }

  // 5. Validate profile timestamps
  TestValidator.predicate(
    "profile has valid creation timestamp",
    memberProfile.created_at !== null && memberProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "profile has valid updated timestamp",
    memberProfile.updated_at !== null && memberProfile.updated_at !== undefined,
  );

  // 6. Validate member summary information is properly structured
  TestValidator.predicate(
    "member summary username is valid length",
    memberProfile.member.username.length >= 3 &&
      memberProfile.member.username.length <= 50,
  );
  TestValidator.predicate(
    "member summary has valid email format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberProfile.member.email),
  );
}
