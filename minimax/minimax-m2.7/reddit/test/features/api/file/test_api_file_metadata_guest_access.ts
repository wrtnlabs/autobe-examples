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

export async function test_api_file_metadata_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {});
  // 2. Upload a file as member
  const uploadedFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(uploadedFile);
  // 3. Create guest connection (no authentication headers)
  const guestConnection: api.IConnection = { host: connection.host };
  // 4. Guest retrieves file metadata without authentication
  const guestFileMetadata = await api.functional.redditClone.files.at(
    guestConnection,
    {
      fileId: uploadedFile.id,
    },
  );
  typia.assert(guestFileMetadata);
  // 5. Validate guest received complete file metadata
  TestValidator.equals(
    "file ID matches",
    guestFileMetadata.id,
    uploadedFile.id,
  );
  TestValidator.equals(
    "original filename matches",
    guestFileMetadata.originalFilename,
    uploadedFile.originalFilename,
  );
  TestValidator.equals(
    "mime type matches",
    guestFileMetadata.mimeType,
    uploadedFile.mimeType,
  );
  TestValidator.equals(
    "file size matches",
    guestFileMetadata.fileSize,
    uploadedFile.fileSize,
  );
  TestValidator.equals(
    "status matches",
    guestFileMetadata.status,
    uploadedFile.status,
  );
  TestValidator.equals(
    "uploader ID matches",
    guestFileMetadata.uploader.id,
    uploadedFile.uploader.id,
  );
  // 6. Validate complete metadata arrays are present for guest
  TestValidator.predicate(
    "thumbnails array exists",
    guestFileMetadata.thumbnails !== undefined,
  );
  TestValidator.predicate(
    "scans array exists",
    guestFileMetadata.scans !== undefined,
  );
  TestValidator.predicate(
    "associations array exists",
    guestFileMetadata.associations !== undefined,
  );
}
