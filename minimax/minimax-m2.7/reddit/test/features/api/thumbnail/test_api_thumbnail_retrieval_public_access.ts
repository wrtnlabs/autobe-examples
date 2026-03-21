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

export async function test_api_thumbnail_retrieval_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and upload a file to generate thumbnails
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const file: IRedditCloneFile =
    await generate_random_reddit_clone_member_files_create(
      memberConnection,
      {},
    );
  // 2. Wait for file processing to complete (thumbnails generation)
  let processedFile: IRedditCloneFile = file;
  let attempts = 0;
  const maxAttempts = 30;
  while (
    (processedFile.status === "pending" ||
      processedFile.status === "scanning") &&
    attempts < maxAttempts
  ) {
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    attempts++;
    if (processedFile.thumbnails.length > 0) {
      break;
    }
    processedFile = file;
  }
  // 3. Verify we have thumbnails to test with
  TestValidator.predicate(
    "file should have thumbnails",
    processedFile.thumbnails.length > 0,
  );
  const thumbnail = processedFile.thumbnails[0]!;
  const fileId = processedFile.id;
  const thumbnailId = thumbnail.id;
  // 4. Create unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // 5. Retrieve thumbnail metadata without authentication (public access)
  const retrievedThumbnail: IRedditCloneFileThumbnail =
    await api.functional.redditClone.files.thumbnails.at(
      unauthenticatedConnection,
      {
        fileId,
        thumbnailId,
      },
    );
  // 6. Validate the response
  typia.assert(retrievedThumbnail);
  TestValidator.equals(
    "thumbnail id matches",
    retrievedThumbnail.id,
    thumbnailId,
  );
  TestValidator.equals("file id matches", retrievedThumbnail.file.id, fileId);
  TestValidator.equals(
    "thumbnail width matches",
    retrievedThumbnail.width,
    thumbnail.width,
  );
  TestValidator.equals(
    "thumbnail height matches",
    retrievedThumbnail.height,
    thumbnail.height,
  );
  TestValidator.equals(
    "thumbnail variant matches",
    retrievedThumbnail.variant,
    thumbnail.variant,
  );
}
