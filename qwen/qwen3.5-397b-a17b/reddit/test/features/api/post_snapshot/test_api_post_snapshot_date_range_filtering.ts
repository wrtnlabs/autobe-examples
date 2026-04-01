import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test post snapshot retrieval with date range filtering.
 *
 * This test verifies the post snapshots endpoint correctly filters snapshots
 * by date range and supports various sorting options. The test flow:
 * 1. Member registration and authentication
 * 2. Community creation and subscription
 * 3. Post creation
 * 4. Snapshot retrieval with date range filtering
 * 5. Validation of filtering and sorting behavior
 */
export async function test_api_post_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Retrieve snapshots with date range filtering
  const now = new Date();
  const fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
  const toDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day ahead
  const snapshotsWithDateRange =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(snapshotsWithDateRange);
  // Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    snapshotsWithDateRange.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page >= 1",
    snapshotsWithDateRange.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit <= 100",
    snapshotsWithDateRange.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records >= 0",
    snapshotsWithDateRange.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages >= 0",
    snapshotsWithDateRange.pagination.pages >= 0,
  );
  // Validate all snapshots are within date range
  for (const snapshot of snapshotsWithDateRange.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at >= from`,
      new Date(snapshot.created_at).getTime() >= fromDate.getTime(),
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at <= to`,
      new Date(snapshot.created_at).getTime() <= toDate.getTime(),
    );
  }
  // 6. Test sorting by created_at ascending
  const snapshotsAsc =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "asc",
        },
      },
    );
  typia.assert(snapshotsAsc);
  // Verify ascending order
  if (snapshotsAsc.data.length > 1) {
    for (let i = 1; i < snapshotsAsc.data.length; i++) {
      TestValidator.predicate(
        `created_at asc order ${i - 1} to ${i}`,
        new Date(snapshotsAsc.data[i - 1].created_at).getTime() <=
          new Date(snapshotsAsc.data[i].created_at).getTime(),
      );
    }
  }
  // 7. Test sorting by created_at descending
  const snapshotsDesc =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(snapshotsDesc);
  // Verify descending order
  if (snapshotsDesc.data.length > 1) {
    for (let i = 1; i < snapshotsDesc.data.length; i++) {
      TestValidator.predicate(
        `created_at desc order ${i - 1} to ${i}`,
        new Date(snapshotsDesc.data[i - 1].created_at).getTime() >=
          new Date(snapshotsDesc.data[i].created_at).getTime(),
      );
    }
  }
  // 8. Test sorting by vote_score
  const snapshotsByVote =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          page: 1,
          limit: 10,
          sort: "vote_score",
          order: "desc",
        },
      },
    );
  typia.assert(snapshotsByVote);
  // 9. Test sorting by comment_count
  const snapshotsByComment =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          page: 1,
          limit: 10,
          sort: "comment_count",
          order: "desc",
        },
      },
    );
  typia.assert(snapshotsByComment);
  // 10. Test pagination
  const snapshotsPage2 =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          page: 2,
          limit: 5,
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(snapshotsPage2);
  TestValidator.predicate(
    "page 2 current is 2",
    snapshotsPage2.pagination.current === 2,
  );
}
