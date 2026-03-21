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

export async function test_api_file_display_name_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Upload an image file
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        mime_type: "image/png",
        original_filename: "original-image.png",
        target_type: "user",
        target_id: authorized.id,
      },
    },
  );
  typia.assert(file);
  // Store original values for comparison
  const originalMimeType = file.mimeType;
  const originalFileSize = file.fileSize;
  const originalStatus = file.status;
  // 3. Update the file's display name
  const newFilename = "updated-image.png";
  const updatedFile = await api.functional.redditClone.member.files.update(
    memberConnection,
    {
      fileId: file.id,
      body: {
        original_filename: newFilename,
      } satisfies IRedditCloneFile.IUpdate,
    },
  );
  typia.assert(updatedFile);
  // 4. Verify originalFilename is updated
  TestValidator.equals(
    "originalFilename updated",
    updatedFile.originalFilename,
    newFilename,
  );
  // 5. Verify other fields remain unchanged
  TestValidator.equals(
    "mimeType unchanged",
    updatedFile.mimeType,
    originalMimeType,
  );
  TestValidator.equals(
    "fileSize unchanged",
    updatedFile.fileSize,
    originalFileSize,
  );
  TestValidator.equals("status unchanged", updatedFile.status, originalStatus);
  // 6. Verify file ID remains the same
  TestValidator.equals("file ID unchanged", updatedFile.id, file.id);
}
