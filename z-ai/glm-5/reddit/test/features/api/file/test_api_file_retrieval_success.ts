import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAvatarFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAvatarFile";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileVersion";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_avatar_create } from "../../../generate/generate_random_community_platform_member_avatar_create";
import { prepare_random_community_platform_avatar_file } from "../../../prepare/prepare_random_community_platform_avatar_file";

/**
 * Test successful retrieval of an existing file's metadata.
 *
 * Setup: Create a member account and upload an avatar image file.
 *
 * Test Steps:
 * 1. Request file metadata using the uploaded file's UUID
 * 2. Verify response includes all required fields: id, originalName, mimeType, fileSize, width, height, fileType, url, createdAt, updatedAt
 * 3. Verify the url field contains a valid CDN-accessible URL
 * 4. Verify the versions array contains display versions (thumbnail, medium, large, original) with dimensions and file sizes
 * 5. Verify the member field is populated with ICommunityPlatformMember.ISummary for avatar file type
 * 6. Verify community and post fields are null for avatar files
 * 7. Verify the file metadata matches the originally uploaded file (correct MIME type, dimensions within expected range)
 */
export async function test_api_file_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Upload avatar image using the utility function
  const member = await generate_random_community_platform_member_avatar_create(
    memberConnection,
    {},
  );
  typia.assert(member);
  // 3. Extract the file UUID from the avatar URL
  // Avatar URL contains the file UUID in its path
  TestValidator.predicate("member has avatar URL", member.avatarUrl !== null);
  const avatarUrl = member.avatarUrl!;
  // Extract UUID from URL (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const uuidMatch = avatarUrl.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  TestValidator.predicate("UUID extracted from avatar URL", uuidMatch !== null);
  const fileId = uuidMatch![0];
  // 4. Retrieve file metadata using the file ID
  const file = await api.functional.communityPlatform.files.at(connection, {
    fileId,
  });
  typia.assert(file);
  // 5. Verify the file ID matches the requested ID
  TestValidator.equals("file ID matches requested ID", file.id, fileId);
  // 6. Verify file type is avatar
  TestValidator.equals("file type is avatar", file.fileType, "avatar");
  // 7. Verify MIME type is an image format (business rule)
  const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  TestValidator.predicate(
    "MIME type is valid image format",
    validMimeTypes.includes(file.mimeType),
  );
  // 8. Verify dimensions are within expected range (business rule: 64-4096)
  TestValidator.predicate(
    "width within valid range",
    (file.width ?? 0) >= 64 && (file.width ?? 0) <= 4096,
  );
  TestValidator.predicate(
    "height within valid range",
    (file.height ?? 0) >= 64 && (file.height ?? 0) <= 4096,
  );
  // 9. Verify the member field is populated for avatar files
  TestValidator.predicate("member field is populated", file.member !== null);
  if (file.member !== null) {
    TestValidator.equals("member ID matches", file.member.id, member.id);
    TestValidator.equals(
      "member username matches",
      file.member.username,
      member.username,
    );
  }
  // 10. Verify community and post fields are null for avatar files
  TestValidator.equals(
    "community is null for avatar file",
    file.community,
    null,
  );
  TestValidator.equals("post is null for avatar file", file.post, null);
  // 11. Verify versions array contains expected display versions (business rule)
  TestValidator.predicate("versions is not empty", file.versions.length > 0);
  const versionTypes = file.versions.map((v) => v.versionType);
  TestValidator.predicate(
    "versions contain thumbnail",
    versionTypes.includes("thumbnail"),
  );
  TestValidator.predicate(
    "versions contain medium",
    versionTypes.includes("medium"),
  );
  TestValidator.predicate(
    "versions contain large",
    versionTypes.includes("large"),
  );
  TestValidator.predicate(
    "versions contain original",
    versionTypes.includes("original"),
  );
  // 12. Verify file URL matches avatar URL
  TestValidator.equals("file URL matches avatar URL", file.url, avatarUrl);
}
