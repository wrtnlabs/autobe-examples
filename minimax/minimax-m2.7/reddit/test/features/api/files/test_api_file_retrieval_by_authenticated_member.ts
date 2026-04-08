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

export async function test_api_file_retrieval_by_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Upload a valid image file
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  // 3. Retrieve the file metadata using GET endpoint
  const retrieved = await api.functional.redditClone.files.at(
    memberConnection,
    {
      fileId: file.id,
    },
  );
  // 4. Validate response structure with typia.assert
  typia.assert(retrieved);
  // 5. Validate file metadata matches upload
  TestValidator.equals("file id matches", retrieved.id, file.id);
  TestValidator.equals(
    "original filename matches",
    retrieved.originalFilename,
    file.originalFilename,
  );
  TestValidator.equals(
    "stored filename matches",
    retrieved.storedFilename,
    file.storedFilename,
  );
  TestValidator.equals("mime type matches", retrieved.mimeType, file.mimeType);
  TestValidator.equals("file size matches", retrieved.fileSize, file.fileSize);
  TestValidator.equals(
    "storage path matches",
    retrieved.storagePath,
    file.storagePath,
  );
  TestValidator.equals("status is processed", retrieved.status, "processed");
  TestValidator.equals(
    "uploader id matches",
    retrieved.uploader.id,
    authorized.id,
  );
  TestValidator.equals(
    "uploader username matches",
    retrieved.uploader.username,
    authorized.username,
  );
  // 6. Validate scan history shows clean status
  TestValidator.predicate("has scan records", retrieved.scans.length > 0);
  TestValidator.equals(
    "latest scan is clean",
    retrieved.scans[0].status,
    "clean",
  );
  // 7. Validate thumbnail variants
  TestValidator.predicate("has thumbnails", retrieved.thumbnails.length > 0);
  TestValidator.predicate(
    "thumbnails have valid dimensions",
    retrieved.thumbnails[0].items.width > 0,
  );
  TestValidator.predicate(
    "thumbnails have paths",
    retrieved.thumbnails[0].items.thumbnailPath.length > 0,
  );
  // 8. Validate polymorphic associations exist
  TestValidator.predicate(
    "associations is array",
    Array.isArray(retrieved.associations),
  );
  // 9. Validate timestamps
  TestValidator.predicate(
    "createdAt timestamp valid",
    retrieved.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp valid",
    retrieved.updatedAt.length > 0,
  );
  TestValidator.equals("deletedAt is null", retrieved.deletedAt, null);
}
