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

export async function test_api_temp_upload_creation_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Upload file using utility function - let it generate random file internally
  const uploadedFile =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {},
    );
  typia.assert(uploadedFile);
  // 3. Extract metadata from uploaded file for temporary upload creation
  const originalFilename = uploadedFile.original_filename;
  const mimeType = uploadedFile.mime_type;
  const fileSize = uploadedFile.file_size;
  const contentHash = uploadedFile.content_hash;
  const uploadIp = uploadedFile.upload_ip;
  const userAgent = uploadedFile.user_agent;
  // 4. Create temporary upload record using utility function with the uploaded file's ID
  const tempUploadResult =
    await generate_random_community_platform_member_temp_uploads_create(
      memberConnection,
      {
        body: {
          communityPlatformFileId: uploadedFile.id,
          originalFilename,
          mimeType,
          fileSize,
          contentHash,
          uploadIp,
          userAgent,
        } satisfies ICommunityPlatformTempUpload.ICreate,
      },
    );
  const tempUpload = typia.assert<ICommunityPlatformTempUpload>(tempUploadResult);
  // 5. Validate temporary upload metadata
  TestValidator.equals(
    "temporary upload status should be pending",
    tempUpload.status,
    "pending",
  );
  TestValidator.equals(
    "original filename should match",
    tempUpload.original_filename,
    originalFilename,
  );
  TestValidator.equals(
    "MIME type should match",
    tempUpload.mime_type,
    mimeType,
  );
  TestValidator.equals(
    "file size should match",
    tempUpload.file_size,
    fileSize,
  );
  TestValidator.equals(
    "content hash should match",
    tempUpload.content_hash,
    contentHash,
  );
  TestValidator.equals(
    "upload IP should match",
    tempUpload.upload_ip,
    uploadIp,
  );
  TestValidator.equals(
    "user agent should match",
    tempUpload.user_agent,
    userAgent,
  );
  // 6. Validate file reference
  TestValidator.equals(
    "file reference ID should match uploaded file",
    tempUpload.file.id,
    uploadedFile.id,
  );
  TestValidator.equals(
    "uploader reference ID should match member",
    tempUpload.uploader.id,
    member.id,
  );
  // 7. Validate expiration timestamp (approximately 24 hours in future)
  const createdAt = new Date(tempUpload.created_at).getTime();
  const expiresAt = new Date(tempUpload.expires_at).getTime();
  const expectedDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const actualDuration = expiresAt - createdAt;
  const tolerance = 60 * 1000; // 1 minute tolerance
  TestValidator.predicate(
    "expiration should be approximately 24 hours after creation",
    Math.abs(actualDuration - expectedDuration) <= tolerance,
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "created_at should be valid ISO date",
    () => !isNaN(new Date(tempUpload.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid ISO date",
    () => !isNaN(new Date(tempUpload.updated_at).getTime()),
  );
  TestValidator.equals(
    "deleted_at should be null",
    tempUpload.deleted_at,
    null,
  );
}