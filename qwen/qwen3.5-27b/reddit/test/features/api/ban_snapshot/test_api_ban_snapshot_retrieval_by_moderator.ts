import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBanSnapshot";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

export async function test_api_ban_snapshot_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test ban snapshot retrieval by moderator for audit trail purposes.
   * This test validates that moderators can access historical ban records
   * for their communities, including all required fields and proper pagination.
   */
  // 1. Register a member account to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {
    body: undefined,
  });
  typia.assert(bannedMember);
  // 2. Create a community for the ban test (using the banned member as owner initially)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      bannedMemberConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Register a moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: undefined,
  });
  typia.assert(moderator);
  // 4. Assign moderator role to the second member (the moderator)
  // The community owner (bannedMember) adds the moderator
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      bannedMemberConnection,
      {
        body: {
          memberId: moderator.id,
          role: "mod",
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Ban the first member from the community (moderator bans the original owner)
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      body: {
        member_id: bannedMember.id,
        reason: "Test ban for snapshot verification",
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // 6. Retrieve ban snapshots as the moderator
  const snapshots = await api.functional.redditClone.ban_snapshots.index(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      },
    },
  );
  typia.assert(snapshots);
  // 7. Verify that ban snapshots are automatically created when bans are issued
  TestValidator.predicate("ban snapshots exist", snapshots.data.length > 0);
  // 8. Confirm that snapshots contain all required fields
  const snapshot = snapshots.data[0];
  typia.assert(snapshot);
  TestValidator.equals("ban_id matches created ban", snapshot.ban_id, ban.id);
  TestValidator.equals(
    "member_id matches banned member",
    snapshot.member_id,
    bannedMember.id,
  );
  TestValidator.equals(
    "community_id matches test community",
    snapshot.community_id,
    community.id,
  );
  TestValidator.equals(
    "banned_by_id matches moderator",
    snapshot.banned_by_id,
    moderator.id,
  );
  TestValidator.equals(
    "reason matches ban reason",
    snapshot.reason,
    "Test ban for snapshot verification",
  );
  TestValidator.predicate(
    "banned_at is valid datetime",
    snapshot.banned_at !== null && snapshot.banned_at !== undefined,
  );
  TestValidator.equals(
    "lifted_at is null for active ban",
    snapshot.lifted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    snapshot.created_at !== null && snapshot.created_at !== undefined,
  );
  // 9. Validate pagination works correctly with the returned data
  TestValidator.equals(
    "pagination current page is 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    snapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is positive",
    snapshots.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages count is at least 1",
    snapshots.pagination.pages >= 1,
  );
  // 10. Ensure the snapshot data accurately reflects the ban state at creation time
  TestValidator.predicate(
    "snapshot has unique id",
    snapshot.id !== null && snapshot.id !== undefined,
  );
  TestValidator.predicate(
    "banned_at is before or equal to created_at",
    new Date(snapshot.banned_at).getTime() <=
      new Date(snapshot.created_at).getTime(),
  );
}
