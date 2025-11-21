import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Test successful retrieval of authenticated member's profile information.
 *
 * This test validates that members can access their own profile data including
 * biography, avatar URL, location, and website information. The test
 * establishes authentication context through member registration, then
 * retrieves the profile using the authenticated member's token and member ID.
 * Validation includes verifying all profile fields are returned correctly and
 * that the response structure matches the expected schema with proper
 * timestamps and member reference.
 */
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member context through registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Retrieve the member's profile using the authenticated connection
  const profile =
    await api.functional.communityPlatform.member.members.profiles.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(profile);

  // Step 3: Validate the profile response structure and field completeness
  TestValidator.equals(
    "profile member reference should match created member",
    profile.member.id,
    member.id,
  );
  TestValidator.equals(
    "profile member email should match",
    profile.member.email,
    member.email,
  );
  TestValidator.equals(
    "profile member display name should match",
    profile.member.display_name,
    member.display_name,
  );

  // Step 4: Verify profile timestamps and member reference integrity
  TestValidator.predicate(
    "profile created_at should be valid date-time",
    !isNaN(new Date(profile.created_at).getTime()),
  );
  TestValidator.predicate(
    "profile updated_at should be valid date-time",
    !isNaN(new Date(profile.updated_at).getTime()),
  );

  // Step 5: Validate optional profile fields structure
  TestValidator.predicate(
    "profile member karma_score should be non-negative",
    profile.member.karma_score >= 0,
  );
  TestValidator.predicate(
    "profile member is_verified should be boolean",
    typeof profile.member.is_verified === "boolean",
  );

  // Validate optional fields existence (they may be undefined)
  if (profile.bio !== undefined) {
    TestValidator.predicate(
      "profile bio should be string when present",
      typeof profile.bio === "string",
    );
  }

  if (profile.avatar_url !== undefined) {
    TestValidator.predicate(
      "profile avatar_url should be valid URI when present",
      () => {
        try {
          new URL(profile.avatar_url!);
          return true;
        } catch {
          return false;
        }
      },
    );
  }

  if (profile.location !== undefined) {
    TestValidator.predicate(
      "profile location should be string when present",
      typeof profile.location === "string",
    );
  }

  if (profile.website !== undefined) {
    TestValidator.predicate(
      "profile website should be valid URI when present",
      () => {
        try {
          new URL(profile.website!);
          return true;
        } catch {
          return false;
        }
      },
    );
  }

  // Validate member last_active_at field
  if (
    profile.member.last_active_at !== null &&
    profile.member.last_active_at !== undefined
  ) {
    TestValidator.predicate(
      "profile member last_active_at should be valid date-time when present",
      !isNaN(new Date(profile.member.last_active_at).getTime()),
    );
  }
}
