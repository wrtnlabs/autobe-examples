import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_files_upload } from "../../../generate/generate_random_community_platform_member_files_upload";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

export async function test_api_profile_update_with_avatar(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register and authenticate a member using utility function
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Upload an image file using utility function
  const upload = await generate_random_community_platform_member_files_upload(
    memberConnection,
    {},
  );
  typia.assert(upload);
  // 3. Update profile with the uploaded file ID as avatar
  const updateResponse =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          avatar_image_id: upload.file.id satisfies string &
            tags.Format<"uuid"> as string,
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // 4. Validate the avatar field contains the file summary with appropriate metadata
  TestValidator.equals(
    "avatar should be set with uploaded file",
    updateResponse.avatar,
    upload.file,
  );
  TestValidator.predicate(
    "avatar file should have public_url",
    updateResponse.avatar !== null && updateResponse.avatar.public_url !== null,
  );
  TestValidator.equals(
    "avatar file ID matches upload",
    updateResponse.avatar?.id,
    upload.file.id,
  );
}
