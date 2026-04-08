import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving the edit history of a post that has been modified multiple times.
 *
 * Validates the post snapshots retrieval functionality by creating a post and verifying that snapshots are returned with correct structure, ordering, and pagination. Each post creation generates an initial snapshot, and subsequent edits would create additional snapshots (though edit functionality is not tested due to API limitations).
 *
 * The test verifies that snapshots contain the expected fields (id, title, post_type, preview, snapshot_created_at), are ordered by creation time in descending order, and that pagination metadata is accurate. The preview field is validated to show appropriate content based on post type.
 *
 * 1. Register and authenticate as a member
 * 2. Subscribe to a community
 * 3. Create a text post with initial title and content
 * 4. Retrieve snapshots for the created post
 * 5. Validate snapshot structure and content
 * 6. Verify pagination metadata
 */
export async function test_api_post_snapshots_edit_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Subscribe to a community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Create a text post with initial title and content
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: subscription.community.id,
        text_content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      },
    },
  );
  typia.assert(post);
  // 4. Retrieve snapshots for the created post
  const snapshotsResponse =
    await api.functional.redditClone.posts.snapshots.index(memberConnection, {
      postId: post.id,
      body: {
        page: 1,
        pageSize: 20,
        sortBy: "snapshot_created_at",
        sortOrder: "desc",
      },
    });
  typia.assert(snapshotsResponse);
  // 5. Validate snapshot structure and content
  TestValidator.predicate(
    "at least one snapshot exists (initial creation)",
    snapshotsResponse.data.length > 0,
  );
  // Validate each snapshot content
  await ArrayUtil.asyncForEach(
    snapshotsResponse.data,
    async (snapshot, index) => {
      typia.assert(snapshot);
      // Validate title matches or is related to the post
      TestValidator.predicate(
        `snapshot ${index} has non-empty title`,
        snapshot.title.length > 0,
      );
      // Validate post_type matches the created post
      TestValidator.equals(
        `snapshot ${index} post_type matches created post`,
        snapshot.post_type,
        post.post_type,
      );
      // Validate snapshot_created_at is valid
      TestValidator.predicate(
        `snapshot ${index} has valid snapshot_created_at`,
        !isNaN(Date.parse(snapshot.snapshot_created_at)),
      );
      // Validate preview based on post type
      if (post.post_type === "text") {
        TestValidator.predicate(
          `snapshot ${index} preview is not null for text post`,
          snapshot.preview !== null,
        );
        if (snapshot.preview !== null) {
          TestValidator.predicate(
            `snapshot ${index} preview length is appropriate for text post`,
            snapshot.preview.length <= 200,
          );
        }
      } else if (post.post_type === "link") {
        TestValidator.predicate(
          `snapshot ${index} preview contains domain for link post`,
          snapshot.preview !== null && snapshot.preview.includes("."),
        );
      } else if (post.post_type === "image") {
        TestValidator.equals(
          `snapshot ${index} preview indicates image type`,
          snapshot.preview,
          "Image",
        );
      }
    },
  );
  // Verify snapshots are ordered by snapshot_created_at in descending order
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const prevDate = new Date(
        snapshotsResponse.data[i - 1].snapshot_created_at,
      ).getTime();
      const currDate = new Date(
        snapshotsResponse.data[i].snapshot_created_at,
      ).getTime();
      TestValidator.predicate(
        `snapshot ${i - 1} is more recent than or equal to snapshot ${i}`,
        prevDate >= currDate,
      );
    }
  }
  // 6. Verify pagination metadata
  typia.assert(snapshotsResponse.pagination);
  TestValidator.equals(
    "pagination current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records count matches data length",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    snapshotsResponse.pagination.pages >= 1,
  );
  // Test with different pagination parameters
  const paginatedResponse =
    await api.functional.redditClone.posts.snapshots.index(memberConnection, {
      postId: post.id,
      body: {
        page: 1,
        pageSize: 10,
        sortBy: "snapshot_created_at",
        sortOrder: "desc",
      },
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination with pageSize 10 has correct limit",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    paginatedResponse.data.length <= 10,
  );
  // Verify snapshot count matches expected (at least 1 for initial creation)
  TestValidator.predicate(
    "snapshot count matches expected minimum (initial creation)",
    snapshotsResponse.data.length >= 1,
  );
}
