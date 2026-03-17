import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";

/**
 * Test file retrieval for a post image that includes thumbnail variants
 * for efficient display in feeds and lists.
 */
export async function test_api_file_retrieval_with_thumbnails(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Upload post image file
  const uploadedFile: IRedditCommunityFile =
    await generate_random_reddit_community_member_files_create(
      memberConnection,
      {
        body: {
          file_type: "post" as const,
          owner_id: typia.random<string & tags.Format<"uuid">>(),
          file_uri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityFile.ICreate,
      },
    );
  typia.assert(uploadedFile);
  // 3. Retrieve file with thumbnails
  const retrievedFile: IRedditCommunityFile =
    await api.functional.redditCommunity.files.at(memberConnection, {
      fileId: uploadedFile.id,
    });
  typia.assert(retrievedFile);
  // 4. Validate file metadata
  TestValidator.equals("file id matches", retrievedFile.id, uploadedFile.id);
  TestValidator.equals(
    "original name preserved",
    retrievedFile.originalName,
    uploadedFile.originalName,
  );
  TestValidator.equals(
    "file name matches",
    retrievedFile.fileName,
    uploadedFile.fileName,
  );
  TestValidator.equals(
    "file path valid",
    retrievedFile.filePath,
    uploadedFile.filePath,
  );
  TestValidator.equals(
    "file type is post_image",
    retrievedFile.fileType,
    "post_image",
  );
  TestValidator.equals(
    "file size matches",
    retrievedFile.fileSize,
    uploadedFile.fileSize,
  );
  TestValidator.equals(
    "mime type matches",
    retrievedFile.mimeType,
    uploadedFile.mimeType,
  );
  TestValidator.equals(
    "created at matches",
    retrievedFile.createdAt,
    uploadedFile.createdAt,
  );
  // 5. Validate file is not soft-deleted
  TestValidator.equals("file not soft-deleted", retrievedFile.deletedAt, null);
  // 6. Validate thumbnail data exists
  TestValidator.notEquals("thumbnail exists", retrievedFile.thumbnail, null);
  TestValidator.predicate(
    "thumbnails array exists",
    () =>
      retrievedFile.thumbnails !== null &&
      retrievedFile.thumbnails !== undefined,
  );
  // 7. Validate primary thumbnail properties
  const thumbnail = retrievedFile.thumbnail!;
  TestValidator.notEquals("thumbnail url valid", thumbnail.thumbnail_url, null);
  TestValidator.notEquals("thumbnail width positive", thumbnail.width, 0);
  TestValidator.notEquals("thumbnail height positive", thumbnail.height, 0);
  TestValidator.notEquals("thumbnail format valid", thumbnail.format, null);
  TestValidator.notEquals("thumbnail variant valid", thumbnail.variant, null);
  TestValidator.notEquals(
    "thumbnail created_at valid",
    thumbnail.created_at,
    null,
  );
  TestValidator.equals(
    "thumbnail deleted_at is null",
    thumbnail.deleted_at,
    null,
  );
  // 8. Validate thumbnails array contains variants
  const thumbnails = retrievedFile.thumbnails!;
  TestValidator.predicate(
    "thumbnails array not empty",
    () => thumbnails.length > 0,
  );
  TestValidator.notEquals(
    "first thumbnail url valid",
    thumbnails[0].thumbnail_url,
    null,
  );
  TestValidator.predicate(
    "first thumbnail width positive",
    () => thumbnails[0].width > 0,
  );
  TestValidator.predicate(
    "first thumbnail height positive",
    () => thumbnails[0].height > 0,
  );
}
