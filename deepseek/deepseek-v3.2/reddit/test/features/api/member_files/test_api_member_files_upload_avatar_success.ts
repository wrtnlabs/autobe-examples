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

/**
 * Test successful image upload for avatar profile picture.
 * 1. Create a member account
 * 2. Upload a JPEG image file for avatar purpose
 * 3. Verify upload succeeds with status 'pending', returns proper metadata
 * 4. Validate upload is associated with the authenticated member
 */
export async function test_api_member_files_upload_avatar_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // 2. Upload JPEG image file using generation utility function
  // The utility function will generate proper upload data with JPEG MIME type
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {
        // Optional: override specific fields for avatar testing
        body: {
          originalFilename: `avatar.jpg`,
          mimeType: "image/jpeg",
        } satisfies Partial<ICommunityPlatformTempUpload.ICreate>,
      },
    );
  typia.assert(tempUpload);
  // 3. Validate response metadata
  TestValidator.equals(
    "upload status should be pending",
    tempUpload.status,
    "pending",
  );
  TestValidator.predicate(
    "should have future expiration timestamp",
    () => new Date(tempUpload.expires_at).getTime() > new Date().getTime(),
  );
  TestValidator.predicate(
    "file size should be positive",
    () => tempUpload.file_size > 0,
  );
  TestValidator.equals(
    "MIME type should be image/jpeg",
    tempUpload.mime_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "original filename should be avatar.jpg",
    tempUpload.original_filename,
    "avatar.jpg",
  );
  // 4. Validate file metadata
  typia.assert(tempUpload.file);
  TestValidator.predicate("file should have valid status", () =>
    ["uploaded", "processing", "completed"].includes(tempUpload.file.status),
  );
  TestValidator.predicate(
    "file size should match upload",
    () => tempUpload.file.size === tempUpload.file_size,
  );
  TestValidator.equals(
    "file MIME type should match",
    tempUpload.file.type,
    tempUpload.mime_type,
  );
  TestValidator.equals(
    "file name should match original filename",
    tempUpload.file.name,
    tempUpload.original_filename,
  );
  // 5. Validate upload association with member
  typia.assert(tempUpload.uploader);
  TestValidator.equals(
    "uploader ID should match member ID",
    tempUpload.uploader.id,
    member.id,
  );
  TestValidator.equals(
    "uploader email should match member email",
    tempUpload.uploader.email,
    member.email,
  );
  TestValidator.equals(
    "uploader username should match member username",
    tempUpload.uploader.username,
    member.username,
  );
  // 6. Validate file can be attached to profile later
  // The file ID is validated by typia.assert, no need for regex check
  TestValidator.predicate("temporary upload should have valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(tempUpload.id),
  );
  TestValidator.predicate("file should have valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(tempUpload.file.id),
  );
  // 7. Validate that virus scanning/content type verification is expected (async processes)
  // The file status may be 'uploaded' (pending processing) or 'processing' (being scanned)
  // or 'completed' (finished processing)
  TestValidator.predicate("file should be in valid processing state", () =>
    ["uploaded", "processing", "completed"].includes(tempUpload.file.status),
  );
}
