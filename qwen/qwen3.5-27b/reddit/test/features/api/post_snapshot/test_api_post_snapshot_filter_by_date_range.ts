import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

export async function test_api_post_snapshot_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create multiple posts
  const post1 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "First Post",
        postType: "text",
        communityId: community.id,
      },
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Second Post",
        postType: "text",
        communityId: community.id,
      },
    },
  );
  typia.assert(post2);
  const post3 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Third Post",
        postType: "text",
        communityId: community.id,
      },
    },
  );
  typia.assert(post3);
  // 4. Edit posts to generate snapshots
  const updatedPost1 = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: post1.id,
      body: { title: "First Post Updated" } satisfies IRedditClonePost.IUpdate,
    },
  );
  typia.assert(updatedPost1);
  const updatedPost2 = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: post2.id,
      body: { title: "Second Post Updated" } satisfies IRedditClonePost.IUpdate,
    },
  );
  typia.assert(updatedPost2);
  // 5. Query snapshots with date range filter
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const snapshotsInRange =
    await api.functional.redditClone.post_snapshots.index(memberConnection, {
      body: {
        captured_at_from: oneHourAgo,
        captured_at_to: oneHourLater,
      } satisfies IRedditClonePostSnapshot.IRequest,
    });
  typia.assert(snapshotsInRange);
  // 6. Validate snapshots are within date range
  TestValidator.predicate(
    "snapshots exist in date range",
    snapshotsInRange.data.length > 0,
  );
  for (const snapshot of snapshotsInRange.data) {
    const capturedAt = new Date(snapshot.captured_at);
    const fromDate = new Date(oneHourAgo);
    const toDate = new Date(oneHourLater);
    TestValidator.predicate(
      `snapshot ${snapshot.id} captured_at >= from`,
      capturedAt >= fromDate,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} captured_at <= to`,
      capturedAt <= toDate,
    );
  }
  // 7. Test empty date range (future dates)
  const farFuture1 = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const farFuture2 = new Date(
    now.getTime() + 730 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const snapshotsEmpty = await api.functional.redditClone.post_snapshots.index(
    memberConnection,
    {
      body: {
        captured_at_from: farFuture1,
        captured_at_to: farFuture2,
      } satisfies IRedditClonePostSnapshot.IRequest,
    },
  );
  typia.assert(snapshotsEmpty);
  TestValidator.equals(
    "empty range returns no snapshots",
    snapshotsEmpty.data.length,
    0,
  );
  TestValidator.equals(
    "empty range records count",
    snapshotsEmpty.pagination.records,
    0,
  );
  // 8. Test single day range
  const singleDayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  ).toISOString();
  const singleDayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();
  const snapshotsSingleDay =
    await api.functional.redditClone.post_snapshots.index(memberConnection, {
      body: {
        captured_at_from: singleDayStart,
        captured_at_to: singleDayEnd,
      } satisfies IRedditClonePostSnapshot.IRequest,
    });
  typia.assert(snapshotsSingleDay);
  for (const snapshot of snapshotsSingleDay.data) {
    const capturedAt = new Date(snapshot.captured_at);
    const startDate = new Date(singleDayStart);
    const endDate = new Date(singleDayEnd);
    TestValidator.predicate(
      `single day snapshot ${snapshot.id} in range`,
      capturedAt >= startDate && capturedAt <= endDate,
    );
  }
}
