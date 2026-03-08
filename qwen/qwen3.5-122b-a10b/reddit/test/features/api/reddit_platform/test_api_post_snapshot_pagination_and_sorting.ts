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
 * Test pagination and sorting functionality for post snapshot retrieval.
 * Validates that pagination parameters correctly slice snapshot lists and
 * sorting by created_at works in both ascending and descending order.
 *
 * Note: Since the available API does not include a post edit endpoint,
 * snapshots may be empty or contain only the initial post snapshot.
 * The test validates pagination and sorting mechanics regardless of snapshot count.
 */
export async function test_api_post_snapshot_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
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
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 5. Retrieve snapshots with pagination - page 1, limit 2
  const page1 = await api.functional.redditPlatform.posts.snapshots.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 2,
        sort: "created_at",
        direction: "asc",
      },
    },
  );
  typia.assert(page1);
  TestValidator.equals("pagination current", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "pagination records non-negative",
    page1.pagination.records >= 0,
  );
  // 6. Retrieve snapshots with pagination - page 2, limit 2
  const page2 = await api.functional.redditPlatform.posts.snapshots.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 2,
        limit: 2,
        sort: "created_at",
        direction: "asc",
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "pagination current page 2",
    page2.pagination.current,
    2,
  );
  // 7. Verify total records consistency across pages
  TestValidator.equals(
    "total records consistent across pages",
    page1.pagination.records,
    page2.pagination.records,
  );
  // 8. Test sorting - ascending order (oldest first)
  const ascSort = await api.functional.redditPlatform.posts.snapshots.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        direction: "asc",
      },
    },
  );
  typia.assert(ascSort);
  // Verify chronological order if multiple snapshots exist
  if (ascSort.data.length > 1) {
    for (let i = 1; i < ascSort.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} >= snapshot ${i - 1} in asc order`,
        ascSort.data[i].created_at >= ascSort.data[i - 1].created_at,
      );
    }
  }
  // 9. Test sorting - descending order (newest first)
  const descSort = await api.functional.redditPlatform.posts.snapshots.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        direction: "desc",
      },
    },
  );
  typia.assert(descSort);
  // Verify reverse chronological order if multiple snapshots exist
  if (descSort.data.length > 1) {
    for (let i = 1; i < descSort.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} <= snapshot ${i - 1} in desc order`,
        descSort.data[i].created_at <= descSort.data[i - 1].created_at,
      );
    }
  }
  // 10. Verify total records match across different sort orders
  TestValidator.equals(
    "total records consistent across sort orders",
    ascSort.pagination.records,
    descSort.pagination.records,
  );
  // 11. Verify pagination pages calculation
  const expectedPages =
    ascSort.pagination.limit > 0
      ? Math.ceil(ascSort.pagination.records / ascSort.pagination.limit)
      : 0;
  TestValidator.equals(
    "pagination pages calculation",
    ascSort.pagination.pages,
    expectedPages,
  );
  // 12. Test edge case: limit 1 to verify single record pagination
  const limit1 = await api.functional.redditPlatform.posts.snapshots.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 1,
        sort: "created_at",
        direction: "asc",
      },
    },
  );
  typia.assert(limit1);
  TestValidator.equals("limit 1 records count", limit1.data.length <= 1, true);
  TestValidator.equals("limit 1 pagination limit", limit1.pagination.limit, 1);
  // 13. Test edge case: large limit (100) to verify max limit handling
  const limit100 = await api.functional.redditPlatform.posts.snapshots.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
        direction: "asc",
      },
    },
  );
  typia.assert(limit100);
  TestValidator.equals(
    "limit 100 pagination limit",
    limit100.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit 100 records within limit",
    limit100.data.length <= 100,
  );
}