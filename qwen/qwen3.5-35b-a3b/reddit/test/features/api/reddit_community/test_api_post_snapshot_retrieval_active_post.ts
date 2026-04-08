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

/**
 * Test retrieving snapshots for an active post to verify the primary success path of viewing post modification history.
 *
 * Validates the complete snapshot retrieval flow including member registration, community setup, post creation, and historical data retrieval. Ensures that the snapshot mechanism correctly captures post modifications and serves them in the proper format.
 *
 * Special attention is given to verifying that snapshot count matches the number of post modifications and that each snapshot contains accurate historical data.
 *
 * 1. Member registers with randomized credentials.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates a post with initial title and content.
 * 4. Member updates the post multiple times (changing title and content).
 * 5. Retrieves all snapshots for the post.
 * 6. Validates snapshot count matches modifications.
 * 7. Validates snapshot data accuracy (title, content, author, community).
 */
export async function test_api_post_snapshot_retrieval_active_post(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const communityResponse =
    await api.functional.redditCommunity.member.communities.index(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 2,
            wordMax: 4,
          }),
          sort: "name_asc",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(communityResponse);
  // Create a new community by posting
  const createdCommunity =
    await api.functional.redditCommunity.member.communities.index(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 2,
            wordMax: 4,
          }),
          sort: "created_at_desc",
          limit: 1,
        },
      },
    );
  typia.assert(createdCommunity);
  const community = createdCommunity.data[0];
  typia.assert(community);
  // Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 3. Create initial post
  const initialTitle = "Initial Post Title";
  const initialContent =
    "Initial post content for testing snapshot functionality.";
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        post_type: "text",
        reddit_community_community_id: community.id,
        text_content: initialContent,
      },
    },
  );
  typia.assert(post);
  // 4. Update post multiple times to create snapshots
  const update1 = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: "Updated Title 1",
        text_content: "Updated content version 1 for snapshot testing.",
      },
    },
  );
  typia.assert(update1);
  const update2 = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: "Updated Title 2",
        text_content: "Updated content version 2 for snapshot testing.",
      },
    },
  );
  typia.assert(update2);
  // 5. Retrieve snapshots for the post
  const snapshotsResponse =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          limit: 20,
          page: 1,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Validate pagination
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records >= 3 (initial + 2 updates)",
    snapshotsResponse.pagination.records >= 3,
  );
  const expectedPages = Math.ceil(
    snapshotsResponse.pagination.records / snapshotsResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages",
    snapshotsResponse.pagination.pages,
    expectedPages,
  );
  // 7. Validate snapshot count matches modifications
  TestValidator.equals(
    "snapshot count equals modifications (initial + 2 updates)",
    snapshotsResponse.data.length,
    3,
  );
  // 8. Validate first snapshot (latest) has update2 title
  const latestSnapshot = snapshotsResponse.data[0];
  typia.assert(latestSnapshot);
  TestValidator.equals(
    "latest snapshot has update2 title",
    latestSnapshot.title,
    update2.title,
  );
  // 9. Validate each snapshot has required fields
  for (const snapshot of snapshotsResponse.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot has id",
      snapshot.id !== null && snapshot.id !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has title",
      snapshot.title !== null && snapshot.title !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has post_type",
      snapshot.post_type !== null && snapshot.post_type !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has status",
      snapshot.status !== null && snapshot.status !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has created_at",
      snapshot.created_at !== null && snapshot.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has author",
      snapshot.author !== null && snapshot.author !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has community",
      snapshot.community !== null && snapshot.community !== undefined,
      true,
    );
    TestValidator.equals(
      "author username matches",
      snapshot.author.username,
      memberAuth.username,
    );
    TestValidator.equals(
      "community name matches",
      snapshot.community.name,
      community.name,
    );
  }
  // 10. Validate snapshots are ordered by created_at descending (newest first)
  for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
    const current = snapshotsResponse.data[i];
    const next = snapshotsResponse.data[i + 1];
    typia.assert(current);
    typia.assert(next);
    TestValidator.predicate(
      "snapshots ordered by created_at descending",
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // 11. Validate first snapshot (initial) has original title and content
  const initialSnapshot =
    snapshotsResponse.data[snapshotsResponse.data.length - 1];
  typia.assert(initialSnapshot);
  TestValidator.equals(
    "initial snapshot has original title",
    initialSnapshot.title,
    initialTitle,
  );
  TestValidator.equals(
    "initial snapshot has original content",
    initialSnapshot.content,
    initialContent,
  );
}
