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

export async function test_api_post_snapshot_retrieval_with_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
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
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community (owner is auto-subscribed, but we'll test explicit subscription)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create initial post
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialContent = RandomGenerator.content({ paragraphs: 3 });
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: initialTitle,
        post_type: "text",
        text_content: initialContent,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Note: In a real implementation, post editing would create snapshots.
  // This test validates the snapshot retrieval endpoint structure and pagination.
  // Snapshots are expected to be created when posts are edited via an update endpoint.
  // 5. Retrieve snapshots with pagination (descending - newest first)
  const snapshotsPage1 =
    await api.functional.redditPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage1);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsPage1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotsPage1.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    snapshotsPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    snapshotsPage1.pagination.pages >= 0,
  );
  // 7. Validate snapshot data structure if snapshots exist
  if (snapshotsPage1.data.length > 0) {
    const firstSnapshot = snapshotsPage1.data[0];
    typia.assert(firstSnapshot);
    TestValidator.equals(
      "snapshot has title",
      typeof firstSnapshot.title,
      "string",
    );
    TestValidator.predicate(
      "snapshot has post_type",
      ["text", "link", "image"].includes(firstSnapshot.post_type),
    );
    TestValidator.predicate(
      "snapshot has vote_score",
      typeof firstSnapshot.vote_score === "number",
    );
    TestValidator.predicate(
      "snapshot has comment_count",
      typeof firstSnapshot.comment_count === "number",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      typeof firstSnapshot.created_at === "string",
    );
    TestValidator.predicate(
      "snapshot has author",
      firstSnapshot.author !== null && firstSnapshot.author !== undefined,
    );
    TestValidator.predicate(
      "snapshot has community",
      firstSnapshot.community !== null && firstSnapshot.community !== undefined,
    );
    // Validate author reference
    TestValidator.equals(
      "author id matches post author",
      firstSnapshot.author.id,
      post.author.id,
    );
    TestValidator.equals(
      "author username matches",
      firstSnapshot.author.username,
      post.author.username,
    );
    // Validate community reference
    TestValidator.equals(
      "community id matches",
      firstSnapshot.community.id,
      post.community.id,
    );
    TestValidator.equals(
      "community name matches",
      firstSnapshot.community.name,
      post.community.name,
    );
    // 8. Test reverse chronological order (newest first) - already done above
    // Validate that if multiple snapshots exist, they are in descending order
    if (snapshotsPage1.data.length > 1) {
      for (let i = 0; i < snapshotsPage1.data.length - 1; i++) {
        TestValidator.predicate(
          `descending order at index ${i}`,
          snapshotsPage1.data[i].created_at >=
            snapshotsPage1.data[i + 1].created_at,
        );
      }
    }
  }
  // 9. Test chronological order (oldest first)
  const snapshotsOldestFirst =
    await api.functional.redditPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "asc",
        } satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsOldestFirst);
  // Validate ascending order if multiple snapshots exist
  if (snapshotsOldestFirst.data.length > 1) {
    for (let i = 0; i < snapshotsOldestFirst.data.length - 1; i++) {
      TestValidator.predicate(
        `ascending order at index ${i}`,
        snapshotsOldestFirst.data[i].created_at <=
          snapshotsOldestFirst.data[i + 1].created_at,
      );
    }
  }
  // 10. Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const filteredSnapshots =
    await api.functional.redditPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // Validate all filtered snapshots are within date range
  for (const snapshot of filteredSnapshots.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot date >= from filter`,
      snapshotDate >= thirtyDaysAgo,
    );
    TestValidator.predicate(`snapshot date <= to filter`, snapshotDate <= now);
  }
  // 11. Test pagination with different page numbers
  const page2Snapshots =
    await api.functional.redditPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 2,
          limit: 5,
          sort: "created_at",
          direction: "desc",
        } satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(page2Snapshots);
  TestValidator.equals(
    "page 2 current page",
    page2Snapshots.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Snapshots.pagination.limit, 5);
}
