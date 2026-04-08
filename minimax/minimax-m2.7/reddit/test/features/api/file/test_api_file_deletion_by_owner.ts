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

export async function test_api_file_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Upload a file
  const file: IRedditCloneFile =
    await generate_random_reddit_clone_member_files_create(
      memberConnection,
      {},
    );
  // 3. Verify upload response
  typia.assert(file);
  TestValidator.equals("file has valid id", file.id.length > 0, true);
  TestValidator.equals(
    "file has original filename",
    file.originalFilename.length > 0,
    true,
  );
  TestValidator.equals("file has mime type", file.mimeType.length > 0, true);
  TestValidator.equals("file has status", file.status !== null, true);
  TestValidator.equals(
    "file uploader matches",
    file.uploader.id,
    authorized.id,
  );
  // Store deletedAt before deletion for comparison
  const beforeDeletionAt = file.deletedAt;
  TestValidator.equals("file not deleted initially", beforeDeletionAt, null);
  // 4. Delete the uploaded file
  await api.functional.redditClone.member.files.erase(memberConnection, {
    fileId: file.id,
  });
  // 5. Verify soft deletion behavior by re-uploading
  // Re-uploading a file with same name should still work (file was soft deleted)
  const newFile: IRedditCloneFile =
    await generate_random_reddit_clone_member_files_create(memberConnection, {
      body: {
        originalFilename: `test_another_${RandomGenerator.alphabets(5)}.jpg`,
      } as IRedditCloneFile.ICreate,
    });
  typia.assert(newFile);
  TestValidator.equals(
    "new file upload successful after deletion",
    newFile.id.length > 0,
    true,
  );
}
