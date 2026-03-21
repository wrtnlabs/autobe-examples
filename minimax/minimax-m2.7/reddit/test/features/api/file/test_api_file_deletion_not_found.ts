import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
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

export async function test_api_file_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test file deletion with non-existent file ID returns 404 Not Found
  // 1. Register a member to authenticate
  // 2. Attempt to delete a file with random UUID that does not exist
  // 3. Verify the response is 404 Not Found with FILE_NOT_FOUND error code
  // 1. Register a member using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID that does not exist in the system
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete non-existent file - should return 404
  await TestValidator.httpError("non-existent file returns 404", 404, () =>
    api.functional.redditClone.member.files.erase(memberConnection, {
      fileId: nonExistentFileId,
    }),
  );
  // Test that already deleted files also return 404
  // This is a second case to ensure idempotent behavior - deleting the same
  // non-existent file twice should both return 404
  await TestValidator.httpError(
    "same non-existent file returns 404 again",
    404,
    () =>
      api.functional.redditClone.member.files.erase(memberConnection, {
        fileId: nonExistentFileId,
      }),
  );
}
