import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test community member creating a basic user profile with only required
 * information including display name. Validates minimal profile setup for users
 * who prefer privacy and simplicity. The test verifies successful profile
 * creation with default values for optional fields and immediate availability
 * for community participation.
 */
export async function test_api_user_profile_creation_with_minimum_data(
  connection: api.IConnection,
) {
  // First, register as a community member to establish authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const nickname = RandomGenerator.name(2);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: nickname,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Create a minimal user profile with only required fields
  const displayName = RandomGenerator.name(3);
  const profile =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: {
          display_name: displayName,
          href: "https://example.com/current-page",
          referrer: "https://example.com/previous-page",
          ip: null, // Optional field set to null as per requirements
          // All other optional fields are omitted to test minimal profile creation
        } satisfies IRedditCommunityUserProfiles.ICreate,
      },
    );

  typia.assert(profile);

  // Verify profile was created with correct minimal data
  TestValidator.equals(
    "profile display name matches input",
    profile.display_name,
    displayName,
  );
  TestValidator.equals("profile is verified", profile.is_verified, false);

  // Verify optional fields have default null/undefined values
  TestValidator.equals("bio is undefined", profile.bio, undefined);
  TestValidator.equals("location is undefined", profile.location, undefined);
  TestValidator.equals(
    "avatar_url is undefined",
    profile.avatar_url,
    undefined,
  );
  TestValidator.equals(
    "profile_banner_url is undefined",
    profile.profile_banner_url,
    undefined,
  );
  TestValidator.equals(
    "website_url is undefined",
    profile.website_url,
    undefined,
  );

  // Verify member relationship is properly established
  TestValidator.equals(
    "profile member id matches created member",
    profile.member.id,
    member.id,
  );
  TestValidator.equals(
    "profile member nickname matches registered nickname",
    profile.member.nickname,
    nickname,
  );
  TestValidator.equals(
    "profile member email matches registered email",
    profile.member.email,
    memberEmail,
  );

  // Verify profile has timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    profile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    profile.updated_at !== undefined,
  );

  // Verify profile is immediately available for community participation
  TestValidator.predicate(
    "profile id is valid UUID",
    typia.is<string & tags.Format<"uuid">>(profile.id),
  );
}
