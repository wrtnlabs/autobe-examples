import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberProfile";

export async function test_api_member_profile_update_with_special_characters(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing special character handling
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "TestPassword123!",
      ip: "127.0.0.1",
      href: "http://localhost:3000/register",
      referrer: "",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);

  const memberId = memberAccount.id;

  // Step 2: Update profile with unicode characters and emojis
  const unicodeDisplayName = "José María 中文 🚀 Émile";
  const unicodeBio =
    "Developer from México 🇲🇽 interested in 日本語 and coding! ✨ Café ☕";

  const updatedProfile =
    await api.functional.communityPlatform.members.profiles.update(connection, {
      memberId,
      body: {
        display_name: unicodeDisplayName,
        bio: unicodeBio,
        location: "São Paulo, Brasil 🏖️",
      } satisfies ICommunityPlatformMemberProfile.IUpdate,
    });
  typia.assert(updatedProfile);

  // Validate that special characters were preserved correctly
  TestValidator.equals(
    "display name preserves unicode characters",
    updatedProfile.display_name,
    unicodeDisplayName,
  );
  TestValidator.equals(
    "bio preserves unicode characters and emojis",
    updatedProfile.bio,
    unicodeBio,
  );
  TestValidator.equals(
    "location preserves special characters",
    updatedProfile.location,
    "São Paulo, Brasil 🏖️",
  );

  // Step 3: Update profile with accented characters and special symbols
  const accentedDisplayName = "Åsa Müller François";
  const accentedBio = "Specialist in café culture & naïve art! ©2024";

  const updatedProfileWithAccents =
    await api.functional.communityPlatform.members.profiles.update(connection, {
      memberId,
      body: {
        display_name: accentedDisplayName,
        bio: accentedBio,
        website_url: "https://example.com/café",
      } satisfies ICommunityPlatformMemberProfile.IUpdate,
    });
  typia.assert(updatedProfileWithAccents);

  // Validate accented characters preservation
  TestValidator.equals(
    "display name preserves accented characters",
    updatedProfileWithAccents.display_name,
    accentedDisplayName,
  );
  TestValidator.equals(
    "bio preserves accented characters",
    updatedProfileWithAccents.bio,
    accentedBio,
  );

  // Step 4: Update profile with mixed special characters and symbols
  const specialCharsDisplayName = "User™ (Support) [Admin] <Developer>";
  const specialCharsBio =
    "Code: (a + b) = result; Testing @username & #hashtags!";

  const updatedProfileWithSpecialChars =
    await api.functional.communityPlatform.members.profiles.update(connection, {
      memberId,
      body: {
        display_name: specialCharsDisplayName,
        bio: specialCharsBio,
      } satisfies ICommunityPlatformMemberProfile.IUpdate,
    });
  typia.assert(updatedProfileWithSpecialChars);

  // Validate special characters preservation
  TestValidator.equals(
    "display name preserves special symbols",
    updatedProfileWithSpecialChars.display_name,
    specialCharsDisplayName,
  );
  TestValidator.equals(
    "bio preserves special symbols and syntax",
    updatedProfileWithSpecialChars.bio,
    specialCharsBio,
  );

  // Step 5: Update profile with right-to-left characters
  const rtlDisplayName = "مصطفى محمد 张三";
  const rtlBio = "مرحبا بك في عالم البرمجة! Hello from العربية 🌍";

  const updatedProfileWithRTL =
    await api.functional.communityPlatform.members.profiles.update(connection, {
      memberId,
      body: {
        display_name: rtlDisplayName,
        bio: rtlBio,
      } satisfies ICommunityPlatformMemberProfile.IUpdate,
    });
  typia.assert(updatedProfileWithRTL);

  // Validate RTL characters preservation
  TestValidator.equals(
    "display name preserves right-to-left characters",
    updatedProfileWithRTL.display_name,
    rtlDisplayName,
  );
  TestValidator.equals(
    "bio preserves mixed RTL and LTR characters",
    updatedProfileWithRTL.bio,
    rtlBio,
  );
}
