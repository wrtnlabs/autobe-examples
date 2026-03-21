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

export async function test_api_file_association_update_user_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins/register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload first image file for initial avatar
  const firstFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: authorized.id,
        target_type: "user",
      },
    },
  );
  typia.assert(firstFile);
  // 3. Create initial file association linking avatar to user
  const initialAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          redditCloneFileId: firstFile.id,
          targetId: authorized.id,
          targetType: "user",
        },
      },
    );
  typia.assert(initialAssociation);
  // Store initial updated_at timestamp
  const initialUpdatedAt = initialAssociation.updated_at;
  // 4. Upload second image file to replace the avatar
  const secondFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: authorized.id,
        target_type: "user",
      },
    },
  );
  typia.assert(secondFile);
  // Verify second file is different from first file
  TestValidator.notEquals(
    "second file is different from first file",
    firstFile.id,
    secondFile.id,
  );
  // 5. Update the file association via PUT with new file ID
  const updatedAssociation =
    await api.functional.redditClone.member.file_associations.update(
      memberConnection,
      {
        associationId: initialAssociation.id,
        body: {
          reddit_clone_file_id: secondFile.id,
        } satisfies IRedditCloneFileAssociation.IUpdate,
      },
    );
  typia.assert(updatedAssociation);
  // 6. Validate the updated association
  TestValidator.equals(
    "association ID remains the same",
    updatedAssociation.id,
    initialAssociation.id,
  );
  TestValidator.equals(
    "target_id matches user ID",
    updatedAssociation.target_id,
    authorized.id,
  );
  TestValidator.equals(
    "target_type is user",
    updatedAssociation.target_type,
    "user",
  );
  TestValidator.equals(
    "file reference updated to second file",
    updatedAssociation.file.id,
    secondFile.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp is refreshed",
    updatedAssociation.updated_at,
    initialUpdatedAt,
  );
}
