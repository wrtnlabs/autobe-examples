import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

/**
 * Test that retrieved member profile includes complete embedded member summary
 * information.
 *
 * This test validates that when retrieving a member's profile, the embedded
 * member summary contains all required fields with proper values. The test
 * workflow:
 *
 * 1. Create a new member account via registration endpoint
 * 2. Extract the created member ID from the registration response
 * 3. Retrieve the member profile using the member ID
 * 4. Validate the profile contains the member field with complete summary
 *    information
 * 5. Verify all member summary fields are properly populated and match
 *    registration data
 * 6. Ensure the 1:1 relationship between profile and member is maintained
 */
export async function test_api_member_profile_with_embedded_member_summary(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8);
  const password = `Secure${RandomGenerator.alphaNumeric(8)}!`;

  const registrationResponse = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email,
        username,
        password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(registrationResponse);

  // Step 2: Extract the created member ID
  const createdMemberId = registrationResponse.id;
  TestValidator.predicate(
    "member ID should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdMemberId,
    ),
  );

  // Step 3: Retrieve the member profile
  const profile = await api.functional.communityPlatform.members.profiles.at(
    connection,
    {
      memberId: createdMemberId,
    },
  );
  typia.assert(profile);

  // Step 4: Validate profile structure and embedded member summary
  TestValidator.equals(
    "profile should have community_platform_member_id matching created member",
    profile.community_platform_member_id,
    createdMemberId,
  );

  TestValidator.predicate(
    "profile should have member field",
    profile.member !== null && profile.member !== undefined,
  );

  // Step 5: Verify all member summary fields
  const memberSummary = profile.member;

  TestValidator.equals(
    "embedded member ID should match created member ID",
    memberSummary.id,
    createdMemberId,
  );

  TestValidator.equals(
    "embedded member username should match registration username",
    memberSummary.username,
    username,
  );

  TestValidator.equals(
    "embedded member email should match registration email",
    memberSummary.email,
    email,
  );

  TestValidator.predicate(
    "embedded member email_verified should be a boolean",
    typeof memberSummary.email_verified === "boolean",
  );

  TestValidator.predicate(
    "embedded member account_status should be valid",
    ["active", "suspended", "pending_deletion", "deleted"].includes(
      memberSummary.account_status,
    ),
  );

  TestValidator.predicate(
    "embedded member karma_score should be non-negative integer",
    typeof memberSummary.karma_score === "number" &&
      memberSummary.karma_score >= 0 &&
      Number.isInteger(memberSummary.karma_score),
  );

  TestValidator.predicate(
    "embedded member created_at should be ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      memberSummary.created_at,
    ),
  );

  // Step 6: Verify 1:1 relationship consistency
  TestValidator.equals(
    "member summary should be consistent across multiple accesses",
    memberSummary.id,
    profile.community_platform_member_id,
  );
}
