import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // Step 2: Create a new community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Subscribe to the created community
  const subscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Step 4: Create a text post
  const post = await api.functional.communityPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Record the post creation timestamp as T0
  const t0 = new Date(post.created_at);
  // Wait briefly to ensure distinct timestamps for subsequent updates
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 6: Update the post at T1
  const update1 = await api.functional.communityPlatform.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  typia.assert(update1);
  const t1 = new Date(update1.updated_at);
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 7: Update the post at T2
  const update2 = await api.functional.communityPlatform.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  typia.assert(update2);
  const t2 = new Date(update2.updated_at);
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 8: Update the post at T3
  const update3 = await api.functional.communityPlatform.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  typia.assert(update3);
  const t3 = new Date(update3.updated_at);
  // Calculate date range filter values
  // created_at_from: timestamp between T0 and T1
  const createdAtFrom = new Date(
    t0.getTime() + (t1.getTime() - t0.getTime()) / 2,
  );
  // created_at_to: timestamp between T2 and T3
  const createdAtTo = new Date(
    t2.getTime() + (t3.getTime() - t2.getTime()) / 2,
  );
  // Step 9: Call the snapshots API with date range filters
  const snapshots =
    await api.functional.communityPlatform.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          created_at_from: createdAtFrom.toISOString() satisfies string &
            tags.Format<"date-time">,
          created_at_to: createdAtTo.toISOString() satisfies string &
            tags.Format<"date-time">,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validation: Response returns HTTP 200 with filtered paginated list
  TestValidator.predicate(
    "pagination current page is valid",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshots.pagination.limit >= 1,
  );
  // Validation: Each returned snapshot has created_at within the specified range
  for (const snapshot of snapshots.data) {
    const snapshotCreatedAt = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot created_at is within filter range`,
      snapshotCreatedAt.getTime() >= createdAtFrom.getTime() &&
        snapshotCreatedAt.getTime() <= createdAtTo.getTime(),
    );
  }
  // Validation: Snapshots are ordered DESC by created_at
  for (let i = 1; i < snapshots.data.length; i++) {
    const prevCreatedAt = new Date(snapshots.data[i - 1].created_at);
    const currCreatedAt = new Date(snapshots.data[i].created_at);
    TestValidator.predicate(
      "snapshots are ordered DESC by created_at",
      prevCreatedAt.getTime() >= currCreatedAt.getTime(),
    );
  }
  // Get all snapshots without filter to verify filtering works
  const allSnapshots =
    await api.functional.communityPlatform.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {} satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Validation: filtered snapshots count is less than or equal to all snapshots count
  TestValidator.predicate(
    "filtered snapshots count <= all snapshots count",
    snapshots.data.length <= allSnapshots.data.length,
  );
  // Validation: pagination records reflect filtered count
  TestValidator.equals(
    "pagination records matches data length",
    snapshots.pagination.records,
    snapshots.data.length,
  );
  // Identify snapshots outside the date range
  const snapshotsBeforeFrom = allSnapshots.data.filter(
    (s) => new Date(s.created_at).getTime() < createdAtFrom.getTime(),
  );
  const snapshotsAfterTo = allSnapshots.data.filter(
    (s) => new Date(s.created_at).getTime() > createdAtTo.getTime(),
  );
  // Validation: Snapshots created outside the date range are excluded
  for (const excludedSnapshot of snapshotsBeforeFrom) {
    TestValidator.predicate(
      "snapshot before date range is excluded",
      !snapshots.data.some((s) => s.id === excludedSnapshot.id),
    );
  }
  for (const excludedSnapshot of snapshotsAfterTo) {
    TestValidator.predicate(
      "snapshot after date range is excluded",
      !snapshots.data.some((s) => s.id === excludedSnapshot.id),
    );
  }
}
