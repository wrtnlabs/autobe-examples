import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_post_snapshot_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Find an existing community to subscribe to
  const existingCommunities =
    await api.functional.redditCommunity.member.communities.index(
      memberConnection,
      {
        body: {
          limit: 5,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(existingCommunities);
  const firstCommunity = existingCommunities.data.length > 0
    ? existingCommunities.data[0]
    : ({} as IRedditCommunityCommunity.ISummary);
  TestValidator.predicate(
    "communities available",
    existingCommunities.data.length > 0,
  );
  // Subscribe to the community
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: firstCommunity.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Create initial post
  const postTitle1 = `Test Post Snapshot ${RandomGenerator.alphabets(8)}`;
  const initialPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: postTitle1,
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
          reddit_community_community_id: firstCommunity.id,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(initialPost);
  const postId = initialPost.id;
  // 4. Create multiple snapshots by updating post with delays
  await new Promise((resolve) => setTimeout(resolve, 100));
  const title2 = `Updated Title v2 ${RandomGenerator.alphabets(6)}`;
  await api.functional.redditCommunity.member.posts.update(memberConnection, {
    postId,
    body: {
      title: title2,
      text_content: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies IRedditCommunityPost.IUpdate,
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const title3 = `Updated Title v3 ${RandomGenerator.alphabets(5)}`;
  await api.functional.redditCommunity.member.posts.update(memberConnection, {
    postId,
    body: {
      title: title3,
      text_content: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IRedditCommunityPost.IUpdate,
  });
  // 5. Retrieve all snapshots for validation
  const allSnapshots =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId,
        body: {
          limit: 100,
          page: 1,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Verify we have at least 3 snapshots (initial + 2 updates)
  TestValidator.predicate(
    "has expected number of snapshots",
    allSnapshots.pagination.records >= 3,
  );
  // Test sorting by created_at ascending
  const ascendingSnapshots =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          limit: 100,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(ascendingSnapshots);
  // Test sorting by created_at descending
  const descendingSnapshots =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 100,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(descendingSnapshots);
  // Test sorting by id
  const idSortedSnapshots =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId,
        body: {
          sortBy: "id",
          sortOrder: "asc",
          limit: 100,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(idSortedSnapshots);
  // Test sorting by status
  const statusSortedSnapshots =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId,
        body: {
          sortBy: "status",
          sortOrder: "asc",
          limit: 100,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(statusSortedSnapshots);
  // Test pagination
  const page1Snapshots =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId,
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(page1Snapshots);
  const page2Snapshots =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId,
        body: {
          page: 2,
          limit: 2,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(page2Snapshots);
  // Verify pagination metadata is accurate
  TestValidator.equals(
    "pagination records match",
    page1Snapshots.pagination.records,
    allSnapshots.pagination.records,
  );
  TestValidator.equals(
    "pagination pages match",
    page1Snapshots.pagination.pages,
    allSnapshots.pagination.pages,
  );
  TestValidator.equals(
    "pagination limit correct",
    page1Snapshots.pagination.limit,
    2,
  );
  // Validate sorting order - ascending should have oldest first
  if (ascendingSnapshots.data.length > 1) {
    const firstCreatedAt = ascendingSnapshots.data[0].created_at;
    const secondCreatedAt = ascendingSnapshots.data[1].created_at;
    TestValidator.predicate(
      "ascending order verified",
      new Date(firstCreatedAt) <= new Date(secondCreatedAt),
    );
  }
  // Validate sorting order - descending should have newest first
  if (descendingSnapshots.data.length > 1) {
    const firstCreatedAt = descendingSnapshots.data[0].created_at;
    const secondCreatedAt = descendingSnapshots.data[1].created_at;
    TestValidator.predicate(
      "descending order verified",
      new Date(firstCreatedAt) >= new Date(secondCreatedAt),
    );
  }
  // Validate pagination data consistency
  const allDataIds = allSnapshots.data.map((s) => s.id);
  const page1DataIds = page1Snapshots.data.map((s) => s.id);
  const page2DataIds = page2Snapshots.data.map((s) => s.id);
  TestValidator.predicate(
    "page 1 data subset of all",
    page1DataIds.every((id) => allDataIds.includes(id)),
  );
  TestValidator.predicate(
    "page 2 data subset of all",
    page2DataIds.every((id) => allDataIds.includes(id)),
  );
}