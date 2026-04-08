import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

export async function test_api_moderator_snapshot_query_by_moderator_themselves(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (community owner) joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {},
  });
  // 2. Member A creates a community (becomes owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      { body: {} },
    );
  // 3. Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {},
  });
  // 4. Member A appoints Member B as moderator
  await generate_random_reddit_clone_member_communities_moderators_create(
    memberAConnection,
    {
      params: { communityId: community.id },
      body: { memberId: memberBAuthorized.id },
    },
  );
  // 5. Member B queries their own moderator snapshots
  const snapshotResponse =
    await api.functional.redditClone.member.communities.moderators.snapshots.index(
      memberBConnection,
      {
        communityId: community.id,
        moderatorId: memberBAuthorized.id,
        body: {},
      },
    );
  typia.assert(snapshotResponse);
  // 6. Validate response
  TestValidator.equals(
    "pagination exists",
    snapshotResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination has valid values",
    snapshotResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "has snapshot data",
    snapshotResponse.data.length > 0,
  );
  const snapshot = snapshotResponse.data[0];
  TestValidator.equals(
    "member is Member B",
    snapshot.member.id,
    memberBAuthorized.id,
  );
  TestValidator.equals("role is moderator", snapshot.role, "moderator");
  TestValidator.equals(
    "assigned by is Member A (owner)",
    snapshot.assignedBy.id,
    memberAAuthorized.id,
  );
  TestValidator.predicate(
    "has valid assignedAt",
    snapshot.assignedAt.length > 0,
  );
  TestValidator.predicate("has valid createdAt", snapshot.createdAt.length > 0);
  TestValidator.equals(
    "community matches",
    snapshot.community.id,
    community.id,
  );
}