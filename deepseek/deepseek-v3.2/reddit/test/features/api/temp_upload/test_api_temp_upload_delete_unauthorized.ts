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

/**
 * Test that a member cannot delete another member's temporary upload.
 *
 * Steps:
 * 1. Create first member account via authorize_member_join
 * 2. Upload file and create temp upload as first member
 * 3. Create second member account via authorize_member_join with different credentials
 * 4. Authenticate as second member
 * 5. Attempt to delete first member's temp upload using DELETE /communityPlatform/member/temp-uploads/{tempUploadId}
 * 6. Verify: Returns 403 Forbidden due to authorization failure
 * 7. Verify the temporary upload record remains unchanged (deleted_at remains null)
 * 8. Verify the associated file record is not deleted
 */
export async function test_api_temp_upload_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member (owner) creation and authentication
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {});
  typia.assert(firstMember);
  // 2. First member uploads a file - this creates a temp upload
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      firstMemberConnection,
      {},
    );
  typia.assert(tempUpload);
  // 3. Second member (unauthorized) creation and authentication
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {});
  typia.assert(secondMember);
  // 4. Attempt unauthorized deletion - should fail with 403
  await TestValidator.httpError(
    "unauthorized deletion should fail with 403",
    403,
    async () => {
      await api.functional.communityPlatform.member.temp_uploads.erase(
        secondMemberConnection,
        { tempUploadId: tempUpload.id },
      );
    },
  );
  // 5. Verify temporary upload still exists and is unchanged
  TestValidator.predicate(
    "temporary upload should not be deleted",
    tempUpload.deleted_at === null,
  );
  // 6. Verify the associated file record is not deleted
  TestValidator.predicate(
    "file should not be deleted",
    tempUpload.file.deleted_at === null,
  );
  // 7. Verify the second member is different from the first
  TestValidator.notEquals(
    "members should be different",
    firstMember.id,
    secondMember.id,
  );
}
