import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";

/**
 * Test successful avatar file upload by an authenticated member.
 * 1. Register member account
 * 2. Upload avatar file with metadata
 * 3. Validate file record with thumbnail generation
 */
export async function test_api_file_upload_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Upload avatar file using utility function
  // The backend will validate that owner_id matches the authenticated user from JWT token
  const avatarFile = await generate_random_reddit_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "avatar",
        file_uri: "https://example.com/avatar.jpg",
      } satisfies DeepPartial<IRedditCommunityFile.ICreate>,
    },
  );
  typia.assert(avatarFile);
  // 3. Validate response structure and content
  TestValidator.equals(
    "fileType is user_avatar",
    avatarFile.fileType,
    "user_avatar",
  );
  // Validate MIME type (should be image type based on file content validation)
  TestValidator.predicate(
    "mimeType is image format",
    avatarFile.mimeType.startsWith("image/"),
  );
  // Validate file size
  TestValidator.predicate(
    "fileSize is positive integer",
    avatarFile.fileSize > 0,
  );
  // Validate filePath is valid URI
  TestValidator.predicate(
    "filePath is valid URI",
    avatarFile.filePath.startsWith("http"),
  );
  // Validate creation timestamp
  const createdAt = new Date(avatarFile.createdAt);
  TestValidator.predicate(
    "createdAt is valid date-time",
    createdAt instanceof Date && !isNaN(createdAt.getTime()),
  );
  // 4. Validate thumbnail generation
  TestValidator.predicate(
    "thumbnail exists",
    avatarFile.thumbnail !== null && avatarFile.thumbnail !== undefined,
  );
  if (avatarFile.thumbnail) {
    typia.assert(avatarFile.thumbnail);
    const thumbnail = avatarFile.thumbnail;
    // Thumbnail URL validation
    TestValidator.predicate(
      "thumbnail has valid URL",
      thumbnail.thumbnail_url.startsWith("http"),
    );
    // Thumbnail dimensions validation
    TestValidator.predicate("thumbnail width is positive", thumbnail.width > 0);
    TestValidator.predicate(
      "thumbnail height is positive",
      thumbnail.height > 0,
    );
    // Thumbnail format validation
    TestValidator.predicate(
      "thumbnail has valid format",
      thumbnail.format.length > 0,
    );
    // Thumbnail variant validation
    TestValidator.predicate(
      "thumbnail has variant",
      thumbnail.variant.length > 0,
    );
    // Thumbnail timestamps validation
    const thumbnailCreatedAt = new Date(thumbnail.created_at);
    const thumbnailUpdatedAt = new Date(thumbnail.updated_at);
    TestValidator.predicate(
      "thumbnail created_at is valid",
      thumbnailCreatedAt instanceof Date &&
        !isNaN(thumbnailCreatedAt.getTime()),
    );
    TestValidator.predicate(
      "thumbnail updated_at is valid",
      thumbnailUpdatedAt instanceof Date &&
        !isNaN(thumbnailUpdatedAt.getTime()),
    );
    // Validate thumbnail deleted_at is null (active)
    TestValidator.equals(
      "thumbnail is active (deleted_at is null)",
      thumbnail.deleted_at,
      null,
    );
  }
  // 5. Validate thumbnails array (if multiple thumbnails generated)
  if (avatarFile.thumbnails !== null && avatarFile.thumbnails !== undefined) {
    TestValidator.equals(
      "thumbnails is array of thumbnails",
      avatarFile.thumbnails.length > 0,
      true,
    );
    for (const thumbnail of avatarFile.thumbnails) {
      typia.assert(thumbnail);
    }
  }
  // 6. Validate userAvatars relationship
  TestValidator.predicate(
    "userAvatars relationship exists",
    avatarFile.userAvatars !== null && avatarFile.userAvatars !== undefined,
  );
  if (
    avatarFile.userAvatars !== null &&
    avatarFile.userAvatars !== undefined &&
    avatarFile.userAvatars.length > 0
  ) {
    const userAvatar = avatarFile.userAvatars[0];
    typia.assert(userAvatar);
    // Validate userAvatar has correct structure
    const userAvatarCreatedAt = new Date(userAvatar.createdAt);
    const userAvatarUpdatedAt = new Date(userAvatar.updatedAt);
    TestValidator.predicate(
      "userAvatar createdAt is valid",
      userAvatarCreatedAt instanceof Date &&
        !isNaN(userAvatarCreatedAt.getTime()),
    );
    TestValidator.predicate(
      "userAvatar updatedAt is valid",
      userAvatarUpdatedAt instanceof Date &&
        !isNaN(userAvatarUpdatedAt.getTime()),
    );
    // Validate userAvatar is active (deletedAt is null)
    TestValidator.equals(
      "userAvatar is active (deletedAt is null)",
      userAvatar.deletedAt,
      null,
    );
    // Validate userAvatar contains file reference
    typia.assert(userAvatar.file);
    TestValidator.equals(
      "userAvatar file matches parent file",
      userAvatar.file.id,
      avatarFile.id,
    );
    // Validate userAvatar contains member reference
    typia.assert(userAvatar.member);
    TestValidator.predicate(
      "userAvatar has valid member",
      userAvatar.member.id.length > 0 && userAvatar.member.username.length > 0,
    );
    // Validate member has profile with avatar_image_url
    if (userAvatar.member.profile !== undefined) {
      typia.assert(userAvatar.member.profile);
      TestValidator.predicate(
        "member profile has avatar_image_url",
        userAvatar.member.profile.avatar_image_url !== null &&
          userAvatar.member.profile.avatar_image_url !== undefined,
      );
    }
  }
}