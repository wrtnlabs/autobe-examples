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

export async function test_api_temp_upload_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Test that an authenticated member can successfully delete their own temporary file upload.
  // Steps: 1) Create member account via join to establish authentication.
  // 2) Upload a file via files upload to get a file record.
  // 3) Create temporary upload record via temp-uploads referencing the uploaded file.
  // 4) Call DELETE /communityPlatform/member/temp-uploads/{tempUploadId} with the temporary upload ID.
  // Verify: Returns success status. The temporary upload record should be soft-deleted.
  // Subsequent attempts to fetch the temp upload should return 404 Not Found.
  // 1. Create member account and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Upload a file to create file metadata
  const uploadedFile =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {
        body: {
          communityPlatformFileId: typia.random<string & tags.Format<"uuid">>(),
          originalFilename: `test-${RandomGenerator.alphaNumeric(8)}.jpg`,
          mimeType: "image/jpeg",
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1024> &
              tags.Maximum<1048576>
          >(),
          contentHash: RandomGenerator.alphaNumeric(64),
          uploadIp: typia.random<string & tags.Format<"ipv4">>(),
          userAgent: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformTempUpload.ICreate,
      },
    );
  typia.assert(uploadedFile);
  // 3. Create temporary upload record referencing the uploaded file
  const tempUpload =
    await generate_random_community_platform_member_temp_uploads_create(
      memberConnection,
      {
        body: {
          communityPlatformFileId: uploadedFile.file.id,
          originalFilename: uploadedFile.original_filename,
          mimeType: uploadedFile.mime_type,
          fileSize: uploadedFile.file_size,
          contentHash: uploadedFile.content_hash,
          uploadIp: uploadedFile.upload_ip,
          userAgent: uploadedFile.user_agent,
        } satisfies ICommunityPlatformTempUpload.ICreate,
      },
    );
  typia.assert(tempUpload);
  // 4. Delete the temporary upload
  await api.functional.communityPlatform.member.temp_uploads.erase(
    memberConnection,
    {
      tempUploadId: uploadedFile.id satisfies string & tags.Format<"uuid">,
    },
  );
  // 5. Verify subsequent fetch returns 404
  await TestValidator.error(
    "temp upload should not be found after deletion",
    async () => {
      // Note: There's no GET endpoint in SDK, but we can test with create which would fail
      // or test with delete again which should fail
      await api.functional.communityPlatform.member.temp_uploads.erase(
        memberConnection,
        {
          tempUploadId: uploadedFile.id satisfies string & tags.Format<"uuid">,
        },
      );
    },
  );
  // 6. Additional validation - verify temp upload data matches creation data
  TestValidator.equals(
    "temp upload creation matches input data",
    {
      communityPlatformFileId: tempUpload.communityPlatformFileId,
      originalFilename: tempUpload.originalFilename,
      mimeType: tempUpload.mimeType,
      fileSize: tempUpload.fileSize,
      contentHash: tempUpload.contentHash,
      uploadIp: tempUpload.uploadIp,
      userAgent: tempUpload.userAgent,
    } satisfies ICommunityPlatformTempUpload.ICreate,
    {
      communityPlatformFileId: uploadedFile.file.id,
      originalFilename: uploadedFile.original_filename,
      mimeType: uploadedFile.mime_type,
      fileSize: uploadedFile.file_size,
      contentHash: uploadedFile.content_hash,
      uploadIp: uploadedFile.upload_ip,
      userAgent: uploadedFile.user_agent,
    },
  );
}
