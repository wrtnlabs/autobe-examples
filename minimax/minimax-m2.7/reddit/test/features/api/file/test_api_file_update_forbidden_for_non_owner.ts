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

export async function test_api_file_update_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (file owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Register member B (non-owner who will attempt unauthorized update)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 3. Create authenticated connection for member A and upload file
  const memberAAuthConnection: api.IConnection = {
    host: connection.host,
  };
  memberAAuthConnection.headers = {
    Authorization: `Bearer ${memberA.token.access}`,
  };
  const file = await generate_random_reddit_clone_member_files_create(
    memberAAuthConnection,
    {
      body: {
        target_id: memberA.id,
        target_type: "user",
      },
    },
  );
  typia.assert(file);
  // 4. Create authenticated connection for member B
  const memberBAuthConnection: api.IConnection = {
    host: connection.host,
  };
  memberBAuthConnection.headers = {
    Authorization: `Bearer ${memberA.token.access}`,
  };
  memberBAuthConnection.headers = {
    Authorization: `Bearer ${memberA.token.access}`,
  };
  memberBAuthConnection.headers = {
    Authorization: `Bearer ${memberA.token.access}`,
  };
  // Wait a moment for file processing
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Member B attempts to update the file uploaded by member A
  // 6. Verify the response returns HTTP 403 Forbidden
  await TestValidator.httpError(
    "non-owner cannot update other user's file",
    403,
    async () =>
      await api.functional.redditClone.member.files.update(
        memberBAuthConnection,
        {
          fileId: file.id,
          body: {
            original_filename: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IRedditCloneFile.IUpdate,
        },
      ),
  );
}
