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
import { generate_random_community_platform_member_avatar_update_avatar } from "../../../generate/generate_random_community_platform_member_avatar_update_avatar";
import { prepare_random_community_platform_avatar_file } from "../../../prepare/prepare_random_community_platform_avatar_file";
import { prepare_random_community_platform_file } from "../../../prepare/prepare_random_community_platform_file";

export async function test_api_avatar_retrieval_after_avatar_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload first avatar image
  const firstAvatarMember =
    await generate_random_community_platform_member_avatar_create(
      memberConnection,
      {
        body: {
          originalName: "first-avatar.jpg",
          mimeType: "image/jpeg",
          file: RandomGenerator.alphaNumeric(100),
        },
      },
    );
  typia.assert(firstAvatarMember);
  // 3. Replace with second avatar image
  const secondAvatarFile =
    await generate_random_community_platform_member_avatar_update_avatar(
      memberConnection,
      {
        body: {
          original_name: "second-avatar.png",
          mime_type: "image/png",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5242880>
          >(),
          data: RandomGenerator.alphaNumeric(200),
        },
      },
    );
  typia.assert(secondAvatarFile);
  // 4. Retrieve avatar via GET endpoint
  const retrievedAvatar =
    await api.functional.communityPlatform.member.avatar.at(memberConnection);
  typia.assert(retrievedAvatar);
  // 5. Verify the response matches the second (replacement) avatar
  TestValidator.equals(
    "avatar ID matches second avatar",
    retrievedAvatar.id,
    secondAvatarFile.id,
  );
  TestValidator.equals(
    "original name matches second avatar",
    retrievedAvatar.originalName,
    "second-avatar.png",
  );
  TestValidator.equals(
    "MIME type matches second avatar",
    retrievedAvatar.mimeType,
    "image/png",
  );
  TestValidator.equals(
    "file type is avatar",
    retrievedAvatar.fileType,
    "avatar",
  );
  // 6. Verify updatedAt is more recent than createdAt (avatar was replaced)
  const createdAt = new Date(retrievedAvatar.createdAt).getTime();
  const updatedAt = new Date(retrievedAvatar.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt is same or more recent than createdAt",
    updatedAt >= createdAt,
  );
  // 7. Verify the member reference exists and matches
  TestValidator.predicate(
    "member reference exists",
    retrievedAvatar.member !== null,
  );
  if (retrievedAvatar.member !== null) {
    TestValidator.equals(
      "member ID matches",
      retrievedAvatar.member.id,
      authorized.id,
    );
  }
}
