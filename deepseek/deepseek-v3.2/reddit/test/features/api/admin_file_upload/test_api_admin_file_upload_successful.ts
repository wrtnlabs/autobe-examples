import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_files_upload } from "../../../generate/generate_random_community_platform_admin_files_upload";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

export async function test_api_admin_file_upload_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize admin using utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Use the generation utility function for file upload
  const tempUpload =
    await generate_random_community_platform_admin_files_upload(
      adminConnection,
      {
        body: {
          communityPlatformFileId: typia.random<string & tags.Format<"uuid">>(),
          originalFilename: "community-icon.png",
          mimeType: "image/png",
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10240000>
          >(),
          contentHash: RandomGenerator.alphaNumeric(64),
          uploadIp: typia.random<string & tags.Format<"ipv4">>(),
          userAgent: RandomGenerator.name(),
        } satisfies ICommunityPlatformTempUpload.ICreate,
      },
    );
  typia.assert(tempUpload);
  // Validate response structure
  TestValidator.equals(
    "status should be pending",
    tempUpload.status,
    "pending",
  );
  TestValidator.equals(
    "mime type should match uploaded image",
    tempUpload.mime_type,
    "image/png",
  );
  TestValidator.equals(
    "original filename should match",
    tempUpload.original_filename,
    "community-icon.png",
  );
  TestValidator.predicate(
    "file size should be positive",
    tempUpload.file_size > 0,
  );
  TestValidator.predicate(
    "content hash should be present",
    tempUpload.content_hash.length > 0,
  );
  TestValidator.equals(
    "upload IP format should be IPv4",
    /^\d{1,3}(\.\d{1,3}){3}$/.test(tempUpload.upload_ip),
    true,
  );
  TestValidator.predicate(
    "user agent should be present",
    tempUpload.user_agent.length > 0,
  );
  // Validate timestamps
  const createdAt = new Date(tempUpload.created_at);
  const updatedAt = new Date(tempUpload.updated_at);
  const expiresAt = new Date(tempUpload.expires_at);
  const now = new Date();
  TestValidator.predicate(
    "created_at should be valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "expires_at should be valid date",
    !isNaN(expiresAt.getTime()),
  );
  // Check expiration is approximately 24 hours in the future
  const hoursDiff =
    (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  TestValidator.predicate(
    "expires_at should be roughly 24 hours after created_at",
    hoursDiff >= 23 && hoursDiff <= 25,
  );
  // Validate file record
  typia.assert(tempUpload.file);
  TestValidator.equals(
    "file status should be uploaded",
    tempUpload.file.status,
    "uploaded",
  );
  TestValidator.equals(
    "file name should match original filename",
    tempUpload.file.name,
    "community-icon.png",
  );
  TestValidator.equals(
    "file type should match mime type",
    tempUpload.file.type,
    "image/png",
  );
  // Validate uploader is admin
  typia.assert(tempUpload.uploader);
  // The uploader should be an admin summary based on actor type
  // Check that uploader has email property from ICommunityPlatformAdmin.ISummary
  TestValidator.predicate(
    "uploader should have email property",
    "email" in tempUpload.uploader &&
      typeof tempUpload.uploader.email === "string",
  );
  // Validate nullable fields
  TestValidator.equals(
    "deleted_at should be null for active upload",
    tempUpload.deleted_at,
    null,
  );
}
