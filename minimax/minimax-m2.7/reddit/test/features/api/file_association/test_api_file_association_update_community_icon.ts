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
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_file_associations_create } from "../../../generate/generate_random_reddit_clone_member_file_associations_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_file_association_update_community_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member (community owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload first image file for community icon
  const firstFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: community.id,
        target_type: "community",
      },
    },
  );
  typia.assert(firstFile);
  // 4. Create initial file association for community icon
  const fileAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          targetId: community.id,
          targetType: "community",
          redditCloneFileId: firstFile.id,
        },
      },
    );
  typia.assert(fileAssociation);
  // Store original updated_at timestamp
  const originalUpdatedAt = fileAssociation.updated_at;
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Upload second image file to replace existing
  const secondFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: community.id,
        target_type: "community",
      },
    },
  );
  typia.assert(secondFile);
  // 6. Update the community icon file association
  const updatedAssociation =
    await api.functional.redditClone.member.file_associations.update(
      memberConnection,
      {
        associationId: fileAssociation.id,
        body: {
          reddit_clone_file_id: secondFile.id,
        } satisfies IRedditCloneFileAssociation.IUpdate,
      },
    );
  typia.assert(updatedAssociation);
  // 7. Validate that the community owner has permission to update icon associations
  TestValidator.equals(
    "association ID unchanged",
    updatedAssociation.id,
    fileAssociation.id,
  );
  TestValidator.equals(
    "target_id unchanged",
    updatedAssociation.target_id,
    community.id,
  );
  TestValidator.equals(
    "target_type unchanged",
    updatedAssociation.target_type,
    "community",
  );
  // 8. Validate that the updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(updatedAssociation.updated_at) > new Date(originalUpdatedAt),
  );
  // 9. Validate that the icon is correctly changed to the new uploaded file
  TestValidator.equals(
    "file changed to second file",
    updatedAssociation.file.id,
    secondFile.id,
  );
  TestValidator.notEquals(
    "file is different from first file",
    updatedAssociation.file.id,
    firstFile.id,
  );
}