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
 * Test unauthorized update attempt on another member's temporary upload.
 *
 * Scenario: Member A creates a temporary upload, then Member B attempts to
 * update it. This should fail with 403 Forbidden error, demonstrating that
 * ownership validation prevents unauthorized modifications even with valid
 * update parameters.
 */
export async function test_api_temp_upload_update_unauthorized_attempt(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A and upload a file
  const memberConnectionA: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberConnectionA, {});
  typia.assert(memberA);
  // Upload a file for Member A (required for temporary upload creation)
  const fileUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnectionA,
      {},
    );
  typia.assert(fileUpload);
  // 2. Create a temporary upload owned by Member A using the uploaded file
  const tempUploadCreate =
    await api.functional.communityPlatform.member.temp_uploads.create(
      memberConnectionA,
      {
        body: {
          communityPlatformFileId: fileUpload.file.id,
          originalFilename: RandomGenerator.alphabets(10) + ".jpg",
          mimeType: "image/jpeg",
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          contentHash: typia.random<string>(),
          uploadIp: typia.random<string & tags.Format<"ipv4">>(),
          userAgent: RandomGenerator.alphabets(20),
        } satisfies ICommunityPlatformTempUpload.ICreate,
      },
    );
  typia.assert(tempUploadCreate);
  // Need to get the full temporary upload object with ID for update
  // Create a separate temp upload to get proper ICommunityPlatformTempUpload object
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnectionA,
      {},
    );
  typia.assert(tempUpload);
  // 3. Create Member B (different account)
  const memberConnectionB: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberConnectionB, {});
  typia.assert(memberB);
  // 4. Attempt to update Member A's temporary upload using Member B's connection
  // Should fail with 403 Forbidden due to ownership validation
  await TestValidator.httpError(
    "member B cannot update member A's temporary upload",
    403,
    async () => {
      await api.functional.communityPlatform.member.temp_uploads.update(
        memberConnectionB,
        {
          tempUploadId: tempUpload.id,
          body: {
            status: "processing",
          } satisfies ICommunityPlatformTempUpload.IUpdate,
        },
      );
    },
  );
  // 5. Verify that Member A can still update their own temporary upload
  // This confirms the temporary upload is still valid and not in a broken state
  const updatedTempUpload =
    await api.functional.communityPlatform.member.temp_uploads.update(
      memberConnectionA,
      {
        tempUploadId: tempUpload.id,
        body: {
          status: "processing",
        } satisfies ICommunityPlatformTempUpload.IUpdate,
      },
    );
  typia.assert(updatedTempUpload);
  TestValidator.equals(
    "temporary upload ID unchanged",
    updatedTempUpload.id,
    tempUpload.id,
  );
  TestValidator.predicate(
    "status updated to processing",
    updatedTempUpload.status === "processing",
  );
}
