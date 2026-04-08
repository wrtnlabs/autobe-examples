import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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

export async function test_api_file_target_reassignment_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Upload an image file
  const createdFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(createdFile);
  // Store original timestamp for comparison
  const originalUpdatedAt = new Date(createdFile.updatedAt).getTime();
  // 3. Update the file's target association to 'community' type
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const updatedFile = await api.functional.redditClone.member.files.update(
    memberConnection,
    {
      fileId: createdFile.id,
      body: {
        targetType: "community",
        targetId: communityId,
      } satisfies IRedditCloneFile.IUpdate,
    },
  );
  typia.assert(updatedFile);
  // 4. Verify file ownership preserved
  TestValidator.equals(
    "uploader id matches authenticated member",
    updatedFile.uploader.id,
    authorized.id,
  );
  // 5. Verify updated_at timestamp changed
  const newUpdatedAt = new Date(updatedFile.updatedAt).getTime();
  TestValidator.predicate(
    "updated_at timestamp reflects modification",
    newUpdatedAt > originalUpdatedAt,
  );
}
