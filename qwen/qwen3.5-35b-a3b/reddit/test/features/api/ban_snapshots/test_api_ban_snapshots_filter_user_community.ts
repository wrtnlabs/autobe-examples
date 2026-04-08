import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBanRecordSnapshot";
import type { IRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecordSnapshot";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_banned_user } from "../../../prepare/prepare_random_reddit_platform_banned_user";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_ban_snapshots_filter_user_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member account (community creator - actor1)
  const actor1Connection: api.IConnection = { host: connection.host };
  const actor1Auth = await authorize_member_join(actor1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(actor1Auth);
  // 2. Join second member account (will be banned - actor2)
  const actor2Connection: api.IConnection = { host: connection.host };
  const actor2Auth = await authorize_member_join(actor2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(actor2Auth);
  // 3. Create a community using actor1
  const community =
    await generate_random_reddit_platform_member_communities_create(
      actor1Connection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(10) +
            "_" +
            RandomGenerator.alphaNumeric(5),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Ban actor2 from the community using actor1
  const ban =
    await generate_random_reddit_platform_member_communities_bans_create(
      actor1Connection,
      {
        body: {
          user_id: actor2Auth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformBannedUser.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(ban);
  // 5. Create another ban for testing has_unban filters
  const actor3Connection: api.IConnection = { host: connection.host };
  const actor3Auth = await authorize_member_join(actor3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(actor3Auth);
  // Create a second ban with expiration date (will have unbanned_at when expired)
  const ban2 =
    await generate_random_reddit_platform_member_communities_bans_create(
      actor1Connection,
      {
        body: {
          user_id: actor3Auth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expiration_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // ban in 30 days
        } satisfies IRedditPlatformBannedUser.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(ban2);
  // 6. Test filter by reddit_platform_user_id
  const userFilterResult =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      actor1Connection,
      {
        body: {
          reddit_platform_user_id: actor2Auth.id,
          limit: 100,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(userFilterResult);
  // Verify filter returns only snapshots for the specified user
  const snapshotsForUser = userFilterResult.data;
  TestValidator.equals(
    "snapshots for user match filter",
    snapshotsForUser.every((snap) => snap.user.id === actor2Auth.id),
    true,
  );
  // 7. Test filter by reddit_platform_community_id
  const communityFilterResult =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      actor1Connection,
      {
        body: {
          reddit_platform_community_id: community.id,
          limit: 100,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(communityFilterResult);
  const snapshotsForCommunity = communityFilterResult.data;
  TestValidator.equals(
    "snapshots for community match filter",
    snapshotsForCommunity.every((snap) => snap.community.id === community.id),
    true,
  );
  // 8. Test filter by reddit_platform_ban_record_id
  const banRecordFilterResult =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      actor1Connection,
      {
        body: {
          reddit_platform_ban_record_id: ban.id,
          limit: 100,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(banRecordFilterResult);
  const snapshotsForBanRecord = banRecordFilterResult.data;
  TestValidator.predicate(
    "ban record filter returns results",
    snapshotsForBanRecord.length > 0,
  );
  TestValidator.predicate(
    "all ban record filter results match the filter",
    snapshotsForBanRecord.every((snap) => snap.user.id === actor2Auth.id),
  );
  // 9. Test filter by has_unban=true (lifted bans only)
  const hasUnbanTrueResult =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      actor1Connection,
      {
        body: {
          has_unban: true,
          limit: 100,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(hasUnbanTrueResult);
  const hasUnbanSnapshots = hasUnbanTrueResult.data;
  TestValidator.predicate(
    "all snapshots with has_unban=true have unbanned_at",
    hasUnbanSnapshots.every(
      (snap) => snap.unbanned_at !== null && snap.unbanned_at !== undefined,
    ),
  );
  // 10. Test filter by has_unban=false (active bans only)
  const hasUnbanFalseResult =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      actor1Connection,
      {
        body: {
          has_unban: false,
          limit: 100,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(hasUnbanFalseResult);
  const hasUnbanFalseSnapshots = hasUnbanFalseResult.data;
  TestValidator.predicate(
    "all snapshots with has_unban=false have null unbanned_at",
    hasUnbanFalseSnapshots.every((snap) => snap.unbanned_at === null),
  );
  // 11. Test combined filters (user + community)
  const combinedFilterResult =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      actor1Connection,
      {
        body: {
          reddit_platform_user_id: actor2Auth.id,
          reddit_platform_community_id: community.id,
          limit: 100,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Verify combined filter returns only snapshots matching BOTH conditions
  TestValidator.predicate(
    "combined filter returns results",
    combinedFilterResult.data.length > 0,
  );
  TestValidator.predicate(
    "all combined filter results match user",
    combinedFilterResult.data.every((snap) => snap.user.id === actor2Auth.id),
  );
  TestValidator.predicate(
    "all combined filter results match community",
    combinedFilterResult.data.every(
      (snap) => snap.community.id === community.id,
    ),
  );
  // 12. Test filter with no matching results
  const noMatchResult =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      actor1Connection,
      {
        body: {
          reddit_platform_user_id: actor1Auth.id, // actor1 was never banned
          limit: 100,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "filter with no matches returns empty array",
    noMatchResult.data.length,
    0,
  );
  // 13. Verify pagination is returned correctly
  TestValidator.predicate(
    "pagination present in response",
    userFilterResult.pagination !== undefined &&
      userFilterResult.pagination.current !== undefined &&
      userFilterResult.pagination.limit !== undefined &&
      userFilterResult.pagination.records !== undefined &&
      userFilterResult.pagination.pages !== undefined,
  );
  // 14. Verify each snapshot has required nested entities
  const allSnapshots = [
    ...userFilterResult.data,
    ...communityFilterResult.data,
    ...hasUnbanFalseSnapshots,
  ];
  allSnapshots.forEach((snap) => {
    TestValidator.predicate(
      `snapshot has user reference`,
      snap.user !== undefined &&
        snap.user.id !== undefined &&
        snap.user.username !== undefined,
    );
    TestValidator.predicate(
      `snapshot has community reference`,
      snap.community !== undefined &&
        snap.community.id !== undefined &&
        snap.community.name !== undefined,
    );
    TestValidator.predicate(
      `snapshot has banned_by reference or null`,
      snap.banned_by === null ||
        (snap.banned_by !== undefined && snap.banned_by.id !== undefined),
    );
  });
  // 15. Verify timestamps are properly formatted
  allSnapshots.forEach((snap) => {
    TestValidator.predicate(
      "snapshot has valid banned_at timestamp",
      !isNaN(Date.parse(snap.banned_at)),
    );
    TestValidator.predicate(
      "snapshot has valid snapshot_created_at timestamp",
      !isNaN(Date.parse(snap.snapshot_created_at)),
    );
    if (snap.unbanned_at !== null && snap.unbanned_at !== undefined) {
      TestValidator.predicate(
        "snapshot has valid unbanned_at timestamp",
        !isNaN(Date.parse(snap.unbanned_at)),
      );
    }
  });
}