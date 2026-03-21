import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileAssociation";
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

export async function test_api_file_association_filter_by_target_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community to use as target entity
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload a file for community icon
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: community.id,
        target_type: "community",
      },
    },
  );
  typia.assert(file);
  // 4. Create file association with community
  const fileAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          redditCloneFileId: file.id,
          targetId: community.id,
          targetType: "community",
        },
      },
    );
  typia.assert(fileAssociation);
  // 5. Filter by target_id - should return the association
  const filteredByTargetId =
    await api.functional.redditClone.file_associations.index(memberConnection, {
      body: {
        targetId: community.id,
      },
    });
  typia.assert(filteredByTargetId);
  // Validate: should have at least one result
  TestValidator.equals(
    "filtered result has data",
    filteredByTargetId.data.length > 0,
    true,
  );
  // Validate: target_id matches exactly
  const foundAssociation = filteredByTargetId.data.find(
    (a) => a.id === fileAssociation.id,
  );
  TestValidator.equals(
    "association found by target_id",
    foundAssociation !== undefined,
    true,
  );
  if (foundAssociation) {
    TestValidator.equals(
      "target_id matches",
      foundAssociation.target_id,
      community.id,
    );
  }
  // 6. Combined filter with target_type and target_id (AND logic)
  const combinedFilter =
    await api.functional.redditClone.file_associations.index(memberConnection, {
      body: {
        targetId: community.id,
        targetType: "community",
      },
    });
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filter returns same results",
    combinedFilter.data.length,
    filteredByTargetId.data.length,
  );
  // 7. Filter with wrong target_type should return empty or no matching
  const wrongTypeFilter =
    await api.functional.redditClone.file_associations.index(memberConnection, {
      body: {
        targetId: community.id,
        targetType: "user",
      },
    });
  typia.assert(wrongTypeFilter);
  // Should not find our community association when filtering by user type
  const foundWithWrongType = wrongTypeFilter.data.find(
    (a) => a.id === fileAssociation.id,
  );
  TestValidator.equals(
    "no match with wrong target_type",
    foundWithWrongType !== undefined,
    false,
  );
  // 8. Filter with non-existent target_id should return empty
  const nonExistentFilter =
    await api.functional.redditClone.file_associations.index(memberConnection, {
      body: {
        targetId: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  typia.assert(nonExistentFilter);
  TestValidator.equals(
    "empty result for non-existent target_id",
    nonExistentFilter.data.length,
    0,
  );
}
