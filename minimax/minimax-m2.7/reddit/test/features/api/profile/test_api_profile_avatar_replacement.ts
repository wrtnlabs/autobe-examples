import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_avatars_create } from "../../../generate/generate_random_reddit_clone_member_avatars_create";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_profile_avatar_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Upload first avatar image
  const firstAvatar = await generate_random_reddit_clone_member_avatars_create(
    memberConnection,
    {
      body: {
        imageData:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        filename: "first_avatar.png",
      },
    },
  );
  typia.assert(firstAvatar);
  // 3. Update profile to set the first avatar
  const profileWithFirstAvatar =
    await api.functional.redditClone.member.profile.update(memberConnection, {
      body: {
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarFileId: firstAvatar.id,
      } satisfies IRedditCloneUserProfile.IUpdate,
    });
  typia.assert(profileWithFirstAvatar);
  // Verify first avatar is set
  TestValidator.notEquals(
    "first avatar should be set",
    profileWithFirstAvatar.avatar,
    null,
  );
  TestValidator.equals(
    "first avatar id should match",
    profileWithFirstAvatar.avatar!.id,
    firstAvatar.id,
  );
  // 4. Upload second different avatar image
  const secondAvatar = await generate_random_reddit_clone_member_avatars_create(
    memberConnection,
    {
      body: {
        imageData:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        filename: "second_avatar.png",
      },
    },
  );
  typia.assert(secondAvatar);
  // Verify second avatar has different ID than first
  TestValidator.notEquals(
    "second avatar should be different",
    secondAvatar.id,
    firstAvatar.id,
  );
  // 5. Update profile to reference the second avatar
  const profileWithSecondAvatar =
    await api.functional.redditClone.member.profile.update(memberConnection, {
      body: {
        displayName: profileWithFirstAvatar.displayName,
        bio: profileWithFirstAvatar.bio,
        avatarFileId: secondAvatar.id,
      } satisfies IRedditCloneUserProfile.IUpdate,
    });
  typia.assert(profileWithSecondAvatar);
  // 6. Verify that the profile now shows the second avatar file details instead of the first
  TestValidator.notEquals(
    "avatar should be different after replacement",
    profileWithSecondAvatar.avatar,
    null,
  );
  TestValidator.equals(
    "second avatar id should match",
    profileWithSecondAvatar.avatar!.id,
    secondAvatar.id,
  );
  TestValidator.notEquals(
    "second avatar id should not be first avatar",
    profileWithSecondAvatar.avatar!.id,
    firstAvatar.id,
  );
}
