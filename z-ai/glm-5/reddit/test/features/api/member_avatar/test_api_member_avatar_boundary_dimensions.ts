import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_community_platform_member_avatar_update_avatar } from "../../../generate/generate_random_community_platform_member_avatar_update_avatar";
import { prepare_random_community_platform_file } from "../../../prepare/prepare_random_community_platform_file";

export async function test_api_member_avatar_boundary_dimensions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create avatar upload data at minimum dimensions (64x64)
  // Use a minimal valid base64 image data
  const webpBase64 =
    "UklGRiQAAABXQVZFZmYIBAAAAAABAAEAAQAAABQAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
  // Calculate file size from base64 (browser-compatible)
  const fileSize = Math.ceil((webpBase64.length * 3) / 4);
  const fileBody = {
    original_name: "avatar_64x64.webp",
    mime_type: "image/webp" as const,
    file_size: fileSize,
    data: webpBase64,
    width: 64,
    height: 64,
  } satisfies ICommunityPlatformFile.ICreate;
  // 3. Upload avatar via SDK function
  const avatar =
    await api.functional.communityPlatform.member.avatar.updateAvatar(
      memberConnection,
      { body: fileBody },
    );
  typia.assert(avatar);
  // 4. Validate minimum dimension boundary (64x64)
  TestValidator.equals("width is minimum 64", avatar.width, 64);
  TestValidator.equals("height is minimum 64", avatar.height, 64);
  // 5. Validate MIME type is image/webp
  TestValidator.equals(
    "MIME type is image/webp",
    avatar.mimeType,
    "image/webp",
  );
  // 6. Validate file size is positive
  TestValidator.predicate("file size is positive", avatar.fileSize > 0);
  // 7. Validate CDN URL is present
  TestValidator.predicate("has valid CDN URL", avatar.url.length > 0);
  // 8. Validate file is properly associated with the member
  TestValidator.predicate("member association exists", avatar.member !== null);
  if (avatar.member !== null) {
    TestValidator.equals(
      "member ID matches",
      avatar.member.id,
      authorized.member.id,
    );
    TestValidator.equals(
      "member username matches",
      avatar.member.username,
      authorized.member.username,
    );
  }
  // 9. Validate file type is avatar
  TestValidator.equals("file type is avatar", avatar.fileType, "avatar");
  // 10. Validate versions array exists
  TestValidator.predicate("has display versions", avatar.versions.length > 0);
}
