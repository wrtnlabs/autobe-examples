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

export async function test_api_file_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Upload avatar to create a file record
  const member = await generate_random_community_platform_member_avatar_create(
    memberConnection,
    {
      body: {
        file: typia.random<string>(),
        originalName: "test-avatar.jpg",
        mimeType: "image/jpeg",
        width: 100,
        height: 100,
      },
    },
  );
  typia.assert(member);
  // Validate avatar URL exists
  if (member.avatarUrl === null) {
    throw new Error("Avatar URL should not be null after upload");
  }
  const avatarUrl: string = member.avatarUrl;
  // 3. Delete the avatar (soft-deletes the file record)
  await api.functional.communityPlatform.member.avatar.erase(memberConnection);
  // 4. Extract file ID (UUID) from the avatar URL using regex
  const uuidMatch = avatarUrl.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  if (uuidMatch === null) {
    throw new Error("Could not extract UUID from avatar URL");
  }
  const fileId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(uuidMatch[0]);
  // 5. Try to access the soft-deleted file - should return 404
  await TestValidator.httpError(
    "soft-deleted file returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.files.at(connection, {
        fileId,
      });
    },
  );
}
