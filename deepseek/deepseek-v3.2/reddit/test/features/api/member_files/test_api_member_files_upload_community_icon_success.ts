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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_files_upload } from "../../../generate/generate_random_community_platform_member_files_upload";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

export async function test_api_member_files_upload_community_icon_success(
  connection: api.IConnection,
): Promise<void> {
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
  // 2. Create community as owner
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Generate file upload data
  const fileId = typia.random<string & tags.Format<"uuid">>();
  const fileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<10485760>
  >();
  const contentHash = RandomGenerator.alphaNumeric(64);
  const uploadIp = typia.random<string & tags.Format<"ipv4">>();
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  // 4. Upload file for community icon
  const upload = await api.functional.communityPlatform.member.files.upload(
    memberConnection,
    {
      body: {
        communityPlatformFileId: fileId,
        originalFilename: "community-icon.png",
        mimeType: "image/png",
        fileSize: fileSize,
        contentHash: contentHash,
        uploadIp: uploadIp,
        userAgent: userAgent,
      } satisfies ICommunityPlatformTempUpload.ICreate,
    },
  );
  typia.assert(upload);
  // 5. Validate upload metadata
  TestValidator.equals(
    "temporary upload ID is UUID",
    typeof upload.id,
    "string",
  );
  TestValidator.predicate(
    "ID is UUID format",
    /^[0-9a-f-]{36}$/i.test(upload.id),
  );
  TestValidator.equals(
    "status should be pending or processing",
    upload.status,
    "pending",
  );
  TestValidator.equals(
    "original filename matches",
    upload.original_filename,
    "community-icon.png",
  );
  TestValidator.equals("MIME type matches", upload.mime_type, "image/png");
  TestValidator.equals("file size matches", upload.file_size, fileSize);
  TestValidator.equals(
    "content hash matches",
    upload.content_hash,
    contentHash,
  );
  TestValidator.equals("upload IP matches", upload.upload_ip, uploadIp);
  TestValidator.equals("user agent matches", upload.user_agent, userAgent);
  // 6. Validate expiration timestamp (within 24 hours +- 5 minutes)
  const expiresAtDate = new Date(upload.expires_at);
  const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const diffMs = Math.abs(expiresAtDate.getTime() - expectedExpiry.getTime());
  TestValidator.predicate(
    "expiration within 5 minutes of 24 hours",
    diffMs <= 5 * 60 * 1000,
  );
  // 7. Validate uploader association
  TestValidator.equals(
    "uploader ID matches member ID",
    upload.uploader.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "uploader email matches",
    upload.uploader.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "uploader username matches",
    upload.uploader.username,
    authorizedMember.username,
  );
  // 8. Validate file reference
  typia.assert(upload.file);
  TestValidator.equals("file ID matches", upload.file.id, fileId);
  TestValidator.equals(
    "file name matches",
    upload.file.name,
    "community-icon.png",
  );
  TestValidator.equals("file type matches", upload.file.type, "image/png");
  TestValidator.equals("file size matches", upload.file.size, fileSize);
  TestValidator.equals(
    "file status is uploaded",
    upload.file.status,
    "uploaded",
  );
  TestValidator.predicate(
    "file actor is the member",
    upload.file.actor.id === authorizedMember.id,
  );
  // 9. Validate timestamps
  TestValidator.predicate(
    "created at is recent",
    new Date(upload.created_at).getTime() > now.getTime() - 60000,
  );
  TestValidator.equals("deleted at is null", upload.deleted_at, null);
  TestValidator.predicate(
    "expires at is in future",
    new Date(upload.expires_at).getTime() > now.getTime(),
  );
}
