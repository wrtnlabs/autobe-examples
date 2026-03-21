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

export async function test_api_file_metadata_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Upload a valid image file to get fileId
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(file);
  // 3. Retrieve file metadata using fileId (public endpoint - no auth required)
  const fileMetadata = await api.functional.redditClone.files.at(connection, {
    fileId: file.id,
  });
  typia.assert(fileMetadata);
  // 4. Validate file metadata fields
  TestValidator.equals("file id matches", fileMetadata.id, file.id);
  TestValidator.equals(
    "original filename exists",
    fileMetadata.originalFilename.length > 0,
    true,
  );
  TestValidator.equals(
    "mime type is image",
    fileMetadata.mimeType.startsWith("image/"),
    true,
  );
  TestValidator.predicate("file size positive", fileMetadata.fileSize > 0);
  TestValidator.equals("status is processed", fileMetadata.status, "processed");
  TestValidator.equals("uploader exists", !!fileMetadata.uploader, true);
  TestValidator.equals(
    "uploader username matches",
    fileMetadata.uploader.username,
    member.username,
  );
  TestValidator.predicate(
    "has thumbnails array",
    Array.isArray(fileMetadata.thumbnails),
  );
  TestValidator.predicate("has scans array", Array.isArray(fileMetadata.scans));
  TestValidator.predicate(
    "has associations array",
    Array.isArray(fileMetadata.associations),
  );
}
