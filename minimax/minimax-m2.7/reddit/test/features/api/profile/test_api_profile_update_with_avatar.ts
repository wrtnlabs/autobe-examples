import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_file_associations_create } from "../../../generate/generate_random_reddit_clone_member_file_associations_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_profile_update_with_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Generate random profile update data
  const newDisplayName = RandomGenerator.paragraph({ sentences: 2 });
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  // 3. Upload avatar file
  // Create a minimal valid image (1x1 red pixel JPEG in base64)
  const minimalJpegBase64 =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAxEPwAB//9k=";
  const file_data = minimalJpegBase64;
  const uploadedFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        file_data,
        mime_type: "image/jpeg",
        original_filename: "avatar.jpg",
        target_id: authorized.profile.id,
        target_type: "user",
      },
    },
  );
  typia.assert(uploadedFile);
  // 4. Create file association for avatar
  const fileAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          redditCloneFileId: uploadedFile.id,
          targetId: authorized.profile.id,
          targetType: "user",
        },
      },
    );
  typia.assert(fileAssociation);
  // 5. Build the avatar_file_uri from the file association
  const avatar_file_uri =
    `https://example.com/redditClone/member/file-associations/${fileAssociation.id}` satisfies string &
      tags.Format<"uri">;
  // 6. Update profile with avatar
  const updatedProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
        bio: newBio,
        avatar_file_uri,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 7. Validations
  // Verify display name was updated
  TestValidator.equals(
    "display_name matches input",
    updatedProfile.display_name,
    newDisplayName,
  );
  // Verify bio was updated
  TestValidator.equals("bio matches input", updatedProfile.bio, newBio);
  // Verify avatar file association is present
  TestValidator.predicate("avatar is set", updatedProfile.avatar !== null);
  if (updatedProfile.avatar) {
    TestValidator.equals(
      "avatar target_type is user",
      updatedProfile.avatar.target_type,
      "user",
    );
    TestValidator.equals(
      "avatar file id matches uploaded file",
      updatedProfile.avatar.file.id,
      uploadedFile.id,
    );
  }
  // Verify updated_at timestamp is recent
  const updatedAt = new Date(updatedProfile.updated_at);
  const now = new Date();
  const timeDiff = now.getTime() - updatedAt.getTime();
  TestValidator.predicate(
    "updated_at is recent (within 1 minute)",
    timeDiff >= 0 && timeDiff < 60000,
  );
}
