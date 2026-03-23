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

/**
 * Test ban snapshot filtering and lifecycle tracking when bans are lifted.
 * 1. Register a member account to be banned
 * 2. Create a community for the ban test
 * 3. Register a moderator account
 * 4. Assign moderator role to the second member
 * 5. Ban the first member from the community
 * 6. Lift the ban to create a second snapshot with lifted_at timestamp
 * 7. Query snapshots filtered by community_id and verify both snapshots
 * 8. Test filtering by lifted_at date ranges
 * 9. Verify chronological ordering by created_at
 */
export async function test_api_ban_snapshot_filtering_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(bannedMember);
  // 2. Create community (banned member becomes owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      bannedMemberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Register moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator);
  // 4. Assign moderator role to second member
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      bannedMemberConnection,
      {
        body: {
          memberId: moderator.id,
          role: "mod",
        } satisfies IRedditCloneCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Ban the first member from the community
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    moderatorConnection,
    {
      body: {
        member_id: bannedMember.id,
        reason: "Test ban for snapshot verification",
      } satisfies IRedditCloneBan.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Lift the ban to create second snapshot
  await api.functional.redditClone.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 7. Query snapshots filtered by community_id
  const allSnapshots = await api.functional.redditClone.ban_snapshots.index(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        sort: "created_at",
        order: "asc",
        limit: 100,
      } satisfies IRedditCloneBanSnapshot.IRequest,
    },
  );
  typia.assert(allSnapshots);
  // Verify we have at least 2 snapshots
  TestValidator.predicate(
    "should have at least 2 snapshots",
    allSnapshots.data.length >= 2,
  );
  // 8. Verify first snapshot has lifted_at as null (active ban)
  const firstSnapshot = allSnapshots.data[0];
  TestValidator.equals(
    "first snapshot lifted_at should be null",
    firstSnapshot.lifted_at,
    null,
  );
  // 9. Verify second snapshot has lifted_at populated
  const secondSnapshot = allSnapshots.data[1];
  TestValidator.predicate(
    "second snapshot lifted_at should not be null",
    secondSnapshot.lifted_at !== null,
  );
  // 10. Test filtering by lifted_at date range
  if (secondSnapshot.lifted_at !== null) {
    const liftedSnapshots =
      await api.functional.redditClone.ban_snapshots.index(
        moderatorConnection,
        {
          body: {
            community_id: community.id,
            lifted_at_from: secondSnapshot.lifted_at,
            lifted_at_to: secondSnapshot.lifted_at,
            sort: "created_at",
            order: "asc",
          } satisfies IRedditCloneBanSnapshot.IRequest,
        },
      );
    typia.assert(liftedSnapshots);
    // Verify we can find the lifted ban snapshot
    TestValidator.predicate(
      "should find lifted ban snapshot by date range",
      liftedSnapshots.data.length >= 1,
    );
    // Verify all returned snapshots have lifted_at
    TestValidator.predicate(
      "all filtered snapshots should have lifted_at",
      liftedSnapshots.data.every((s) => s.lifted_at !== null),
    );
  }
  // 11. Verify chronological ordering by created_at
  TestValidator.predicate(
    "snapshots should be ordered by created_at ascending",
    allSnapshots.data.every(
      (snapshot, index, array) =>
        index === 0 ||
        new Date(snapshot.created_at) >= new Date(array[index - 1].created_at),
    ),
  );
  // 12. Verify ban_id consistency across snapshots
  TestValidator.equals(
    "all snapshots should reference same ban_id",
    allSnapshots.data.every((s) => s.ban_id === ban.id),
    true,
  );
  // 13. Verify member_id consistency
  TestValidator.equals(
    "all snapshots should reference same member_id",
    allSnapshots.data.every((s) => s.member_id === bannedMember.id),
    true,
  );
  // 14. Verify community_id consistency
  TestValidator.equals(
    "all snapshots should reference same community_id",
    allSnapshots.data.every((s) => s.community_id === community.id),
    true,
  );
}
