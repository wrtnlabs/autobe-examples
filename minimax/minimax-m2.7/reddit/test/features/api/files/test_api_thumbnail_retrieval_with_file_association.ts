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

export async function test_api_thumbnail_retrieval_with_file_association(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Upload an image file to generate thumbnail for retrieval
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: authorized.id,
        target_type: "user",
      },
    },
  );
  typia.assert(file);
  // 3. Retrieve thumbnail metadata using file ID and thumbnail ID
  const thumbnailId = file.thumbnails[0]?.id;
  TestValidator.predicate("has at least one thumbnail", !!thumbnailId);
  const thumbnail = await api.functional.redditClone.files.thumbnails.at(
    memberConnection,
    {
      fileId: file.id,
      thumbnailId: thumbnailId!,
    },
  );
  typia.assert(thumbnail);
  // 4. Validate thumbnail metadata
  TestValidator.equals("thumbnail id matches", thumbnail.id, thumbnailId);
  TestValidator.predicate("width is positive", thumbnail.width > 0);
  TestValidator.predicate("height is positive", thumbnail.height > 0);
  TestValidator.predicate("has variant", !!thumbnail.variant);
  TestValidator.predicate("has thumbnail_path", !!thumbnail.thumbnail_path);
  TestValidator.predicate("has created_at", !!thumbnail.created_at);
  TestValidator.predicate("has updated_at", !!thumbnail.updated_at);
  // 5. Verify file association correctly links back to parent file
  TestValidator.equals(
    "file.id matches fileId path parameter",
    thumbnail.file.id,
    file.id,
  );
  TestValidator.equals(
    "file original filename matches",
    thumbnail.file.originalFilename,
    file.originalFilename,
  );
  TestValidator.equals(
    "file mime type matches",
    thumbnail.file.mimeType,
    file.mimeType,
  );
}
