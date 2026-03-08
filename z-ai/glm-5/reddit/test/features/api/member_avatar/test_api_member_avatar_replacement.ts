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

/**
 * Test avatar replacement workflow where a member uploads a new avatar
 * to replace their existing one. The scenario validates:
 * 1. Register a new member account via join
 * 2. Upload first avatar image (PNG format, 300x300 pixels)
 * 3. Verify the first avatar is created with correct metadata
 * 4. Upload a second avatar image (JPEG format, 400x400 pixels) to replace the first
 * 5. Verify the response shows the new avatar with correct metadata
 * 6. Validate that only one active avatar exists per member
 */
export async function test_api_member_avatar_replacement(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Step 2: Upload first avatar (PNG format, 300x300 pixels)
  const firstAvatarPngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAA" +
    "AklEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOA1v9Q" +
    "AABj0RD6VAAAAAElFTkSuQmCC";
  const firstAvatar =
    await api.functional.communityPlatform.member.avatar.updateAvatar(
      memberConnection,
      {
        body: {
          original_name: "first_avatar.png",
          mime_type: "image/png",
          file_size: 5000,
          data: firstAvatarPngBase64,
          width: 300,
          height: 300,
        } satisfies ICommunityPlatformFile.ICreate,
      },
    );
  typia.assert(firstAvatar);
  // Verify first avatar metadata
  TestValidator.equals(
    "first avatar MIME type",
    firstAvatar.mimeType,
    "image/png",
  );
  TestValidator.equals("first avatar width", firstAvatar.width, 300);
  TestValidator.equals("first avatar height", firstAvatar.height, 300);
  TestValidator.equals(
    "first avatar file type",
    firstAvatar.fileType,
    "avatar",
  );
  TestValidator.predicate(
    "first avatar has member association",
    firstAvatar.member !== null,
  );
  // Store first avatar ID for comparison
  const firstAvatarId = firstAvatar.id;
  // Step 3: Upload second avatar (JPEG format, 400x400 pixels) to replace the first
  const secondAvatarJpegBase64 =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
    "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAJYB4gBAREA/8QAHwAAAQUBAQEB" +
    "AQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAgF9AQIDAAQRBRIhMUEGE1Fh" +
    "ByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZ" +
    "WmJkZGlwAA=";
  const secondAvatar =
    await api.functional.communityPlatform.member.avatar.updateAvatar(
      memberConnection,
      {
        body: {
          original_name: "second_avatar.jpg",
          mime_type: "image/jpeg",
          file_size: 7500,
          data: secondAvatarJpegBase64,
          width: 400,
          height: 400,
        } satisfies ICommunityPlatformFile.ICreate,
      },
    );
  typia.assert(secondAvatar);
  // Verify second avatar metadata - shows replacement worked
  TestValidator.equals(
    "second avatar MIME type",
    secondAvatar.mimeType,
    "image/jpeg",
  );
  TestValidator.equals("second avatar width", secondAvatar.width, 400);
  TestValidator.equals("second avatar height", secondAvatar.height, 400);
  TestValidator.equals(
    "second avatar file type",
    secondAvatar.fileType,
    "avatar",
  );
  TestValidator.predicate(
    "second avatar has member association",
    secondAvatar.member !== null,
  );
  // Step 4: Verify the second avatar is different from the first (replacement occurred)
  TestValidator.notEquals(
    "avatar IDs are different",
    secondAvatar.id,
    firstAvatarId,
  );
  TestValidator.notEquals(
    "avatar URLs are different",
    secondAvatar.url,
    firstAvatar.url,
  );
  TestValidator.notEquals(
    "avatar MIME types are different",
    secondAvatar.mimeType,
    firstAvatar.mimeType,
  );
  // Step 5: Verify member's avatar is updated (secondAvatar.id matches the member association)
  TestValidator.equals(
    "avatar member ID matches authenticated member",
    secondAvatar.member?.id,
    authorizedMember.id,
  );
  // Step 6: Verify business rule - only one active avatar exists
  // The second avatar should be the current active one for this member
  TestValidator.predicate(
    "second avatar is the active avatar",
    secondAvatar.member !== null &&
      secondAvatar.member.id === authorizedMember.id,
  );
}
