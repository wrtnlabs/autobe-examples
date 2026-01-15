import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_profile_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: joinInput });
  typia.assert(authorized);
  // Extract member ID from authorized response
  const memberId: string = authorized.id;
  // Define update values
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const newAvatarUrl = "https://example.com/avatar.png";
  // Update member profile with various fields
  const updatedProfile =
    await api.functional.communityPlatform.member.members.update(
      memberConnection,
      {
        memberId: memberId,
        body: {
          name: newDisplayName, // Fixed: use 'name' instead of 'displayName'
          bio: newBio,
          avatar_url: newAvatarUrl, // Fixed: use 'avatar_url' instead of 'avatarUrl'
          is_private: true, // Theme: use 'is_private' to set privacy
          email_opt_in: true, // Fixed: use 'email_opt_in' instead of 'emailOptIn'
          notification_enabled: false, // Fixed: use 'notification_enabled' instead of 'notificationEnabled'
          language_preference: "ko-KR", // Fixed: use 'language_preference' instead of 'languagePreference'
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Verify display name update
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name, // Fixed: use 'display_name' instead of 'displayName'
    newDisplayName,
  );
  // Verify bio update
  TestValidator.equals("bio updated", updatedProfile.bio, newBio);
  // Verify avatar URL update
  TestValidator.equals(
    "avatar URL updated",
    updatedProfile.avatar_url, // Fixed: use 'avatar_url' instead of 'avatarUrl'
    newAvatarUrl,
  );
  // Verify language preference updated
  TestValidator.equals(
    "language preference updated",
    updatedProfile.language_preference, // Fixed: use 'language_preference' instead of 'languagePreference'
    "ko-KR",
  );
  // Attempt to update with duplicate display name (should fail)
  await TestValidator.error("duplicate display name should fail", async () => {
    await api.functional.communityPlatform.member.members.update(
      memberConnection,
      {
        memberId: memberId,
        body: {
          name: newDisplayName, // Fixed: use 'name' instead of 'displayName'
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  });
}
