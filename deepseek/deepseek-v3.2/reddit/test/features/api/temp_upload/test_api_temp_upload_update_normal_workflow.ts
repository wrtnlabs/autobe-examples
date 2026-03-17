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

export async function test_api_temp_upload_update_normal_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. File upload via utility function - creates temporary upload
  const tempUpload =
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
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          contentHash: typia.random<string>(),
          uploadIp: typia.random<string & tags.Format<"ipv4">>(),
          userAgent: "Mozilla/5.0",
        } satisfies ICommunityPlatformTempUpload.ICreate,
      },
    );
  typia.assert(tempUpload);
  TestValidator.equals(
    "initial status should be pending",
    tempUpload.status,
    "pending",
  );
  // 3. Update status from 'pending' to 'processing'
  const processingUpdate =
    await api.functional.communityPlatform.member.temp_uploads.update(
      memberConnection,
      {
        tempUploadId: tempUpload.id,
        body: {
          status: "processing",
        } satisfies ICommunityPlatformTempUpload.IUpdate,
      },
    );
  typia.assert(processingUpdate);
  TestValidator.equals(
    "status should be processing",
    processingUpdate.status,
    "processing",
  );
  TestValidator.equals(
    "file relationship preserved",
    processingUpdate.file.id,
    tempUpload.file.id,
  );
  TestValidator.equals(
    "uploader relationship preserved",
    processingUpdate.uploader.id,
    member.id,
  );
  TestValidator.equals(
    "original filename unchanged",
    processingUpdate.original_filename,
    tempUpload.original_filename,
  );
  TestValidator.equals(
    "mime type unchanged",
    processingUpdate.mime_type,
    tempUpload.mime_type,
  );
  TestValidator.equals(
    "file size unchanged",
    processingUpdate.file_size,
    tempUpload.file_size,
  );
  // 4. Update status from 'processing' to 'attached'
  const attachedUpdate =
    await api.functional.communityPlatform.member.temp_uploads.update(
      memberConnection,
      {
        tempUploadId: tempUpload.id,
        body: {
          status: "attached",
        } satisfies ICommunityPlatformTempUpload.IUpdate,
      },
    );
  typia.assert(attachedUpdate);
  TestValidator.equals(
    "status should be attached",
    attachedUpdate.status,
    "attached",
  );
  TestValidator.equals(
    "file relationship preserved",
    attachedUpdate.file.id,
    tempUpload.file.id,
  );
  TestValidator.equals(
    "uploader relationship preserved",
    attachedUpdate.uploader.id,
    member.id,
  );
  TestValidator.equals(
    "original filename unchanged",
    attachedUpdate.original_filename,
    tempUpload.original_filename,
  );
  TestValidator.equals(
    "mime type unchanged",
    attachedUpdate.mime_type,
    tempUpload.mime_type,
  );
  TestValidator.equals(
    "file size unchanged",
    attachedUpdate.file_size,
    tempUpload.file_size,
  );
  TestValidator.equals(
    "content hash unchanged",
    attachedUpdate.content_hash,
    tempUpload.content_hash,
  );
  // 5. Validate all fields except status remain identical across all versions
  TestValidator.equals(
    "original filename unchanged across all updates",
    tempUpload.original_filename,
    processingUpdate.original_filename,
  );
  TestValidator.equals(
    "original filename unchanged across all updates",
    tempUpload.original_filename,
    attachedUpdate.original_filename,
  );
  TestValidator.equals(
    "mime type unchanged across all updates",
    tempUpload.mime_type,
    attachedUpdate.mime_type,
  );
  TestValidator.equals(
    "file size unchanged across all updates",
    tempUpload.file_size,
    attachedUpdate.file_size,
  );
  TestValidator.equals(
    "content hash unchanged across all updates",
    tempUpload.content_hash,
    attachedUpdate.content_hash,
  );
  TestValidator.equals(
    "file id unchanged across all updates",
    tempUpload.file.id,
    attachedUpdate.file.id,
  );
  TestValidator.equals(
    "uploader id unchanged across all updates",
    tempUpload.uploader.id,
    attachedUpdate.uploader.id,
  );
}
