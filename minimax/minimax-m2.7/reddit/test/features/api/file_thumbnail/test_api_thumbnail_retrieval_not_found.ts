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

/**
 * Test retrieving thumbnail metadata when the thumbnail does not exist.
 *
 * This test validates that the system properly handles requests for
 * non-existent thumbnails by returning a 404 error. The test workflow:
 * 1. Authenticate as a member
 * 2. Upload a valid image file
 * 3. Attempt to retrieve thumbnail metadata using a non-existent thumbnail ID
 * 4. Verify that the system returns a 404 error indicating the thumbnail was not found
 */
export async function test_api_thumbnail_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMemberSession.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Upload a valid image file
  const file: IRedditCloneFile =
    await generate_random_reddit_clone_member_files_create(
      memberConnection,
      {},
    );
  // 3. Generate a random UUID that doesn't exist (never been generated)
  const nonExistentThumbnailId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve thumbnail metadata using non-existent thumbnail ID
  // 5. Verify that the system returns a 404 error
  await TestValidator.httpError(
    "non-existent thumbnail should return 404",
    404,
    async () =>
      await api.functional.redditClone.files.thumbnails.at(connection, {
        fileId: file.id,
        thumbnailId: nonExistentThumbnailId,
      }),
  );
}
