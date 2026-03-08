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

export async function test_api_member_avatar_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {});
  typia.assert(auth);
  // 2. Prepare avatar upload data with valid JPEG parameters
  const avatarBody = {
    original_name: "test-avatar.jpg",
    mime_type: "image/jpeg" as const,
    file_size: 100,
    data: RandomGenerator.alphaNumeric(100),
    width: 200,
    height: 200,
  } satisfies ICommunityPlatformFile.ICreate;
  // 3. Upload avatar using the utility function
  const uploadedFile =
    await generate_random_community_platform_member_avatar_update_avatar(
      memberConnection,
      { body: avatarBody },
    );
  typia.assert(uploadedFile);
  // 4. Validate response metadata
  TestValidator.equals("member id matches", uploadedFile.member?.id, auth.id);
  TestValidator.equals("file type is avatar", uploadedFile.fileType, "avatar");
  TestValidator.equals(
    "mime type matches",
    uploadedFile.mimeType,
    avatarBody.mime_type,
  );
  TestValidator.equals("width matches", uploadedFile.width, avatarBody.width);
  TestValidator.equals(
    "height matches",
    uploadedFile.height,
    avatarBody.height,
  );
}
