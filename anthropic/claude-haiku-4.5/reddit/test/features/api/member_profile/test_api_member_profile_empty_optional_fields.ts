import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

/**
 * Test retrieval of a member profile with empty optional fields.
 *
 * This test validates that when a member account is created with minimal
 * profile data (no optional customization), the profile retrieval correctly
 * handles empty optional fields. The workflow is:
 *
 * 1. Create a new member account with only required fields (email, username,
 *    password, href, referrer)
 * 2. Retrieve the member's profile using their ID
 * 3. Verify that optional fields (display_name, bio, profile_image_url, location,
 *    website_url) are properly represented as undefined
 * 4. Validate that required fields (id, member summary, timestamps) are properly
 *    populated
 * 5. Ensure member information is correctly included in the profile response
 */
export async function test_api_member_profile_empty_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with minimal required fields
  const password = RandomGenerator.alphaNumeric(12);
  const createData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: "TestPass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: createData,
  });
  typia.assert(authorizedMember);

  const memberId = authorizedMember.id;

  // Step 2: Retrieve the member's profile
  const profile = await api.functional.communityPlatform.members.profiles.at(
    connection,
    {
      memberId: memberId,
    },
  );
  typia.assert(profile);

  // Step 3: Validate required profile fields are populated
  TestValidator.predicate(
    "profile ID is valid UUID",
    typeof profile.id === "string" && profile.id.length > 0,
  );
  TestValidator.equals(
    "profile member ID matches created member ID",
    profile.community_platform_member_id,
    memberId,
  );

  // Step 4: Validate member summary information is included
  TestValidator.predicate(
    "member summary exists in profile",
    profile.member !== null && profile.member !== undefined,
  );
  TestValidator.equals(
    "member ID in summary matches",
    profile.member.id,
    memberId,
  );
  TestValidator.equals(
    "member username matches created username",
    profile.member.username,
    createData.username,
  );
  TestValidator.equals(
    "member email matches created email",
    profile.member.email,
    createData.email,
  );

  // Step 5: Validate member summary fields
  TestValidator.predicate(
    "member email_verified is boolean",
    typeof profile.member.email_verified === "boolean",
  );
  TestValidator.predicate(
    "member account_status is valid status",
    ["active", "suspended", "pending_deletion", "deleted"].includes(
      profile.member.account_status,
    ),
  );
  TestValidator.predicate(
    "member karma_score is non-negative number",
    typeof profile.member.karma_score === "number" &&
      profile.member.karma_score >= 0,
  );

  // Step 6: Validate timestamps exist and are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updated_at),
  );

  // Step 7: Validate optional fields are undefined when not provided
  TestValidator.predicate(
    "display_name is undefined for new profile",
    profile.display_name === undefined,
  );
  TestValidator.predicate(
    "bio is undefined for new profile",
    profile.bio === undefined,
  );
  TestValidator.predicate(
    "profile_image_url is undefined for new profile",
    profile.profile_image_url === undefined,
  );
  TestValidator.predicate(
    "location is undefined for new profile",
    profile.location === undefined,
  );
  TestValidator.predicate(
    "website_url is undefined for new profile",
    profile.website_url === undefined,
  );

  // Step 8: Validate theme_preference is undefined or has valid value
  TestValidator.predicate(
    "theme_preference is undefined or valid enum value",
    profile.theme_preference === undefined ||
      profile.theme_preference === "light" ||
      profile.theme_preference === "dark" ||
      profile.theme_preference === "auto",
  );
}
