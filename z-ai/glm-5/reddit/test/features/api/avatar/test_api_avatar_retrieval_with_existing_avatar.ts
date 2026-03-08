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
 * Test retrieving avatar metadata when the authenticated member has previously uploaded an avatar image.
 */
export async function test_api_avatar_retrieval_with_existing_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register a new member using utility function
  const authorized = await authorize_member_join(memberConnection, {});
  // 3. Upload an avatar using utility function
  await generate_random_community_platform_member_avatar_create(
    memberConnection,
    {},
  );
  // 4. Retrieve the avatar using the authenticated member connection
  const avatar =
    await api.functional.communityPlatform.member.avatar.at(memberConnection);
  // 5. Validate response structure with typia.assert
  typia.assert(avatar);
  // 6. Verify avatar file metadata
  TestValidator.equals("file type is avatar", avatar.fileType, "avatar");
  TestValidator.predicate("file size is positive", avatar.fileSize > 0);
  TestValidator.predicate(
    "mimeType is valid image type",
    avatar.mimeType === "image/jpeg" ||
      avatar.mimeType === "image/png" ||
      avatar.mimeType === "image/gif" ||
      avatar.mimeType === "image/webp",
  );
  // 7. Verify image dimensions (width and height are nullable, but should have values for avatars)
  TestValidator.predicate(
    "width in valid range",
    avatar.width !== null && avatar.width >= 64 && avatar.width <= 4096,
  );
  TestValidator.predicate(
    "height in valid range",
    avatar.height !== null && avatar.height >= 64 && avatar.height <= 4096,
  );
  TestValidator.predicate("has valid CDN URL", avatar.url.startsWith("http"));
  // 8. Verify member relationship - member should be non-null for avatar files
  TestValidator.predicate("member exists", avatar.member !== null);
  TestValidator.equals(
    "member id matches authenticated user",
    avatar.member!.id,
    authorized.id,
  );
  TestValidator.equals(
    "username matches",
    avatar.member!.username,
    authorized.username,
  );
  // 9. Verify community and post are null for avatar files
  TestValidator.equals("community is null for avatar", avatar.community, null);
  TestValidator.equals("post is null for avatar", avatar.post, null);
  // 10. Verify versions array contains all display version types
  TestValidator.predicate(
    "versions array not empty",
    avatar.versions.length > 0,
  );
  const versionTypes = avatar.versions.map((v) => v.versionType);
  TestValidator.predicate(
    "has thumbnail version",
    versionTypes.includes("thumbnail"),
  );
  TestValidator.predicate(
    "has medium version",
    versionTypes.includes("medium"),
  );
  TestValidator.predicate("has large version", versionTypes.includes("large"));
  TestValidator.predicate(
    "has original version",
    versionTypes.includes("original"),
  );
  // 11. Verify each version has valid properties
  for (const version of avatar.versions) {
    TestValidator.predicate(
      "version has valid URL",
      version.url.startsWith("http"),
    );
    TestValidator.predicate("version width positive", version.width > 0);
    TestValidator.predicate("version height positive", version.height > 0);
    TestValidator.predicate("version file size positive", version.fileSize > 0);
  }
}
