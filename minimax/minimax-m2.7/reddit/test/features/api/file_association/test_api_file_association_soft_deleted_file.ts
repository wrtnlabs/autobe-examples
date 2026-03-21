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
import { generate_random_reddit_clone_member_file_associations_create } from "../../../generate/generate_random_reddit_clone_member_file_associations_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_file_association_soft_deleted_file(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const session = await authorize_member_join(memberConnection, {});
  // 2. Upload a file to create a file entity
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: session.profile.id,
        target_type: "user",
      },
    },
  );
  typia.assert(file);
  // 3. Create a file association linking the uploaded file
  const association =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          redditCloneFileId: file.id,
          targetId: session.profile.id,
          targetType: "user",
        },
      },
    );
  typia.assert(association);
  // 4. Soft-delete the uploaded file
  await api.functional.redditClone.member.files.erase(memberConnection, {
    fileId: file.id,
  });
  // 5. Verify 404 error when retrieving association for soft-deleted file
  await TestValidator.httpError(
    "should return 404 for soft-deleted file association",
    404,
    async () =>
      await api.functional.redditClone.file_associations.at(memberConnection, {
        associationId: association.id,
      }),
  );
}
