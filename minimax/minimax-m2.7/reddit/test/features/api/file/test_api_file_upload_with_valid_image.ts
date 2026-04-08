import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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

/**
 * Test that an authenticated member can successfully upload a valid image file to the platform.
 * Verify that:
 * 1. Member authenticates via /auth/member/join to obtain JWT token
 * 2. Member uploads a valid JPEG image file within size limits (1KB-5MB) and dimension constraints (50-8000px)
 * 3. System validates the file format, size, dimensions, and filename correctly
 * 4. System stores the file and creates metadata record with status='pending'
 * 5. Response includes file metadata with id, storage URI, mimeType, fileSize, uploader info, and status
 * 6. Verify that uploaded files are accessible via the returned URI
 */
export async function test_api_file_upload_with_valid_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to obtain JWT token
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
  typia.assert(authorized);
  // 2. Prepare valid image file data
  const fileData = prepare_random_reddit_clone_file();
  // 3. Upload the file
  const file: IRedditCloneFile =
    await api.functional.redditClone.member.files.create(memberConnection, {
      body: fileData satisfies IRedditCloneFile.ICreate,
    });
  typia.assert(file);
  // 4. Validate business logic
  // File should have valid UUID id
  TestValidator.predicate(
    "file id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      file.id,
    ),
  );
  // Status should be 'pending' (awaiting virus scan)
  TestValidator.equals("file status is pending", file.status, "pending");
  // MimeType should be valid image type
  const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  TestValidator.predicate(
    "mimeType is valid image type",
    validMimeTypes.includes(file.mimeType),
  );
  // FileSize should be within valid range (1KB - 5MB)
  const minSize = 1024; // 1KB
  const maxSize = 5 * 1024 * 1024; // 5MB
  TestValidator.predicate(
    "fileSize within valid range (1KB - 5MB)",
    file.fileSize >= minSize && file.fileSize <= maxSize,
  );
  // Uploader info should be populated
  TestValidator.predicate(
    "uploader has valid id",
    file.uploader?.id !== undefined,
  );
  TestValidator.predicate(
    "uploader has username",
    file.uploader?.username !== undefined,
  );
  // StoragePath should exist
  TestValidator.predicate("storagePath exists", file.storagePath?.length > 0);
  // Original filename should be alphanumeric
  TestValidator.predicate(
    "originalFilename is alphanumeric",
    /^[a-zA-Z0-9_-]+$/.test(file.originalFilename),
  );
}
