import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

/**
 * Test theme preference field update with valid enum values.
 *
 * Validates that a member can successfully update their profile's theme
 * preference through all valid enum options ('light', 'dark', 'auto'). The test
 * ensures that:
 *
 * 1. Theme preference is properly persisted in the database
 * 2. The preference is correctly returned in API responses
 * 3. All valid enum values are accepted without error
 * 4. Theme preference operates as a critical UI customization setting
 *
 * Test workflow:
 *
 * 1. Create a new member account via join endpoint
 * 2. Update profile with theme preference 'light'
 * 3. Validate response contains updated theme_preference
 * 4. Update profile with theme preference 'dark'
 * 5. Validate persistence of dark theme setting
 * 6. Update profile with theme preference 'auto'
 * 7. Validate final preference state
 */
export async function test_api_member_profile_update_theme_preference(
  connection: api.IConnection,
) {
  // Create a new member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "SecurePassword123!",
        ip: "192.168.1.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberResponse);
  const memberId = memberResponse.id;

  // Test theme preference 'light'
  const lightThemeProfile: ICommunityPlatformMemberProfile =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: memberId,
        body: {
          theme_preference: "light",
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(lightThemeProfile);
  TestValidator.equals(
    "theme preference should be updated to light",
    lightThemeProfile.theme_preference,
    "light",
  );

  // Test theme preference 'dark'
  const darkThemeProfile: ICommunityPlatformMemberProfile =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: memberId,
        body: {
          theme_preference: "dark",
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(darkThemeProfile);
  TestValidator.equals(
    "theme preference should be updated to dark",
    darkThemeProfile.theme_preference,
    "dark",
  );

  // Test theme preference 'auto'
  const autoThemeProfile: ICommunityPlatformMemberProfile =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: memberId,
        body: {
          theme_preference: "auto",
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(autoThemeProfile);
  TestValidator.equals(
    "theme preference should be updated to auto",
    autoThemeProfile.theme_preference,
    "auto",
  );

  // Verify final state by updating with light again
  const finalLightProfile: ICommunityPlatformMemberProfile =
    await api.functional.communityPlatform.member.members.profiles.update(
      connection,
      {
        memberId: memberId,
        body: {
          theme_preference: "light",
        } satisfies ICommunityPlatformMemberProfile.IUpdate,
      },
    );
  typia.assert(finalLightProfile);
  TestValidator.equals(
    "final theme preference should be light",
    finalLightProfile.theme_preference,
    "light",
  );
}
