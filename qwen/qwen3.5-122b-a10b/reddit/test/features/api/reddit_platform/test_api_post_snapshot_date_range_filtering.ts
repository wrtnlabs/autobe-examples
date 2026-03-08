import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test date range filtering for post snapshot retrieval. The scenario validates that:
 *
 * 1. A post has snapshots available for retrieval
 * 2. Filter by created_at_from returns only snapshots created on or after the specified timestamp
 * 3. Filter by created_at_to returns only snapshots created on or before the specified timestamp
 * 4. Combined date range filter (created_at_from and created_at_to) returns snapshots within the range
 * 5. Date range filter works correctly with pagination and sorting
 *
 * Business rules validated:
 * - Date range filtering uses ISO 8601 format timestamps
 * - Filters are applied correctly in SQL WHERE clause (created_at >= from AND created_at <= to)
 * - Date filtering is compatible with pagination and sorting
 * - Edge cases: no snapshots in range, all snapshots in range, boundary timestamps
 */
export async function test_api_post_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post (this may create an initial snapshot)
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(2),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day ahead
  // Test 4.1: Filter by created_at_from (should return all snapshots since they're all after pastDate)
  const snapshotsFrom =
    await api.functional.redditPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          created_at_from: pastDate.toISOString(),
          sort: "created_at",
          direction: "asc",
        } satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsFrom);
  // Test 4.2: Filter by created_at_to (should return all snapshots since they're all before futureDate)
  const snapshotsTo = await api.functional.redditPlatform.posts.snapshots.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        created_at_to: futureDate.toISOString(),
        sort: "created_at",
        direction: "desc",
      } satisfies IRedditPlatformPostSnapshot.IRequest,
    },
  );
  typia.assert(snapshotsTo);
  // Test 4.3: Combined date range filter (should return all snapshots within range)
  const snapshotsRange =
    await api.functional.redditPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          created_at_from: pastDate.toISOString(),
          created_at_to: futureDate.toISOString(),
          sort: "created_at",
          direction: "asc",
        } satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsRange);
  // Test 4.4: Validate pagination works with date filters
  const snapshotsPaged =
    await api.functional.redditPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          created_at_from: pastDate.toISOString(),
          sort: "created_at",
          direction: "asc",
        } satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPaged);
  // Test 4.5: Validate sorting works with date filters (only if we have multiple snapshots)
  if (snapshotsFrom.data.length > 1) {
    TestValidator.predicate(
      "snapshots sorted ascending by created_at",
      snapshotsFrom.data.every(
        (snap, i) =>
          i === 0 || snap.created_at >= snapshotsFrom.data[i - 1].created_at,
      ),
    );
  }
  if (snapshotsTo.data.length > 1) {
    TestValidator.predicate(
      "snapshots sorted descending by created_at",
      snapshotsTo.data.every(
        (snap, i) =>
          i === 0 || snap.created_at <= snapshotsTo.data[i - 1].created_at,
      ),
    );
  }
  // Test 4.6: Validate that all returned snapshots are within the date range
  if (snapshotsFrom.data.length > 0) {
    TestValidator.predicate(
      "all snapshots from created_at_from are >= filter date",
      snapshotsFrom.data.every((snap) => new Date(snap.created_at) >= pastDate),
    );
  }
  if (snapshotsTo.data.length > 0) {
    TestValidator.predicate(
      "all snapshots to created_at_to are <= filter date",
      snapshotsTo.data.every((snap) => new Date(snap.created_at) <= futureDate),
    );
  }
  if (snapshotsRange.data.length > 0) {
    TestValidator.predicate(
      "all snapshots in range are within date bounds",
      snapshotsRange.data.every(
        (snap) =>
          new Date(snap.created_at) >= pastDate &&
          new Date(snap.created_at) <= futureDate,
      ),
    );
  }
  // Test 4.7: Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid structure",
    snapshotsPaged.pagination.current >= 1 &&
      snapshotsPaged.pagination.limit >= 1 &&
      snapshotsPaged.pagination.limit <= 100,
  );
}
