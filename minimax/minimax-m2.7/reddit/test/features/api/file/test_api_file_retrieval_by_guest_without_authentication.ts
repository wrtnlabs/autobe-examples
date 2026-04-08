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

export async function test_api_file_retrieval_by_guest_without_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Upload a file as the authenticated member
  const uploadedFile: IRedditCloneFile =
    await generate_random_reddit_clone_member_files_create(
      memberConnection,
      {},
    );
  typia.assert(uploadedFile);
  // 3. Create a guest connection without authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // No Authorization header - this is an unauthenticated guest
  // 4. Retrieve file metadata as guest
  const fileMetadata: IRedditCloneFile.IInvert =
    await api.functional.redditClone.files.at(guestConnection, {
      fileId: uploadedFile.id,
    });
  typia.assert(fileMetadata);
  // 5. Validate guest access succeeded and returned complete metadata
  TestValidator.equals("file ID matches", fileMetadata.id, uploadedFile.id);
  TestValidator.equals(
    "original filename matches",
    fileMetadata.originalFilename,
    uploadedFile.originalFilename,
  );
  TestValidator.equals(
    "mime type matches",
    fileMetadata.mimeType,
    uploadedFile.mimeType,
  );
  TestValidator.equals(
    "file size matches",
    fileMetadata.fileSize,
    uploadedFile.fileSize,
  );
  TestValidator.equals(
    "storage path matches",
    fileMetadata.storagePath,
    uploadedFile.storagePath,
  );
  TestValidator.equals(
    "status matches",
    fileMetadata.status,
    uploadedFile.status,
  );
  TestValidator.equals(
    "uploader id matches",
    fileMetadata.uploader.id,
    authorized.id,
  );
  TestValidator.equals(
    "uploader username matches",
    fileMetadata.uploader.username,
    authorized.username,
  );
  TestValidator.predicate(
    "has associations array",
    fileMetadata.associations instanceof Array,
  );
  TestValidator.predicate(
    "has scans array",
    fileMetadata.scans instanceof Array,
  );
  TestValidator.predicate(
    "has thumbnails array",
    fileMetadata.thumbnails instanceof Array,
  );
  TestValidator.predicate(
    "createdAt exists",
    fileMetadata.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt exists",
    fileMetadata.updatedAt !== undefined,
  );
  TestValidator.predicate("deletedAt is null", fileMetadata.deletedAt === null);
}
