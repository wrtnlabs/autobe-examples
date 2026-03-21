import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_file_upload_for_user_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCloneMemberSession.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Prepare a valid JPEG image (base64 encoded)
  // Create a small valid JPEG for testing (1x1 pixel minimum valid JPEG)
  // This is a minimal valid JPEG file structure
  const validJpegBase64 =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==";
  // 3. Upload the file for user avatar using generation utility
  const fileUpload: IRedditCloneFile =
    await generate_random_reddit_clone_member_files_create(memberConnection, {
      body: {
        file_data: validJpegBase64,
        mime_type: "image/jpeg",
        original_filename: "avatar_test.jpg",
        target_id: member.id,
        target_type: "user",
      },
    });
  typia.assert(fileUpload);
  // 4. Validate the response
  TestValidator.equals(
    "original filename matches",
    fileUpload.originalFilename,
    "avatar_test.jpg",
  );
  TestValidator.equals(
    "mime type is image/jpeg",
    fileUpload.mimeType,
    "image/jpeg",
  );
  TestValidator.predicate(
    "file size is within valid range (1KB - 5MB)",
    fileUpload.fileSize >= 1024 && fileUpload.fileSize <= 5242880,
  );
  TestValidator.equals(
    "uploader username matches member",
    fileUpload.uploader.username,
    member.username,
  );
  TestValidator.equals(
    "uploader id matches member",
    fileUpload.uploader.id,
    member.id,
  );
  TestValidator.equals(
    "file status is valid",
    ["pending", "scanning", "processed"].includes(fileUpload.status),
    true,
  );
  TestValidator.predicate(
    "file has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      fileUpload.id,
    ),
  );
  TestValidator.predicate(
    "file has thumbnails array",
    Array.isArray(fileUpload.thumbnails),
  );
  TestValidator.predicate(
    "file has scans array",
    Array.isArray(fileUpload.scans),
  );
  TestValidator.predicate(
    "file has associations array",
    Array.isArray(fileUpload.associations),
  );
  TestValidator.predicate(
    "file has valid createdAt timestamp",
    !isNaN(Date.parse(fileUpload.createdAt)),
  );
  TestValidator.predicate(
    "file has valid updatedAt timestamp",
    !isNaN(Date.parse(fileUpload.updatedAt)),
  );
  // 5. Validate the file association
  const userAssociation = fileUpload.associations.find(
    (assoc) => assoc.target_type === "user",
  );
  TestValidator.equals(
    "user association exists",
    userAssociation !== undefined,
    true,
  );
  if (userAssociation) {
    TestValidator.equals(
      "user association target_id matches member id",
      userAssociation.target_id,
      member.id,
    );
    TestValidator.equals(
      "user association target_type is user",
      userAssociation.target_type,
      "user",
    );
  }
}
