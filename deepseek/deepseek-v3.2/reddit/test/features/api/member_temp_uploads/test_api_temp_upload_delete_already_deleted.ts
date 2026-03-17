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
import { generate_random_community_platform_member_temp_uploads_create } from "../../../generate/generate_random_community_platform_member_temp_uploads_create";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

export async function test_api_temp_upload_delete_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register via utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create a temporary upload via generate_random_community_platform_member_files_upload
  //    This creates both a file and a temporary upload
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {},
    );
  typia.assert(tempUpload);
  // 3. Delete the temporary upload successfully
  await api.functional.communityPlatform.member.temp_uploads.erase(
    memberConnection,
    { tempUploadId: tempUpload.id },
  );
  // 4. Attempt to delete the same temporary upload again (should return 404)
  await TestValidator.error("already deleted temp upload", async () => {
    await api.functional.communityPlatform.member.temp_uploads.erase(
      memberConnection,
      { tempUploadId: tempUpload.id },
    );
  });
  // 5. Test with invalid UUID format (should return 400 Bad Request)
  await TestValidator.httpError("invalid UUID format", 400, async () => {
    await api.functional.communityPlatform.member.temp_uploads.erase(
      memberConnection,
      { tempUploadId: "not-a-valid-uuid" as any },
    );
  });
}
