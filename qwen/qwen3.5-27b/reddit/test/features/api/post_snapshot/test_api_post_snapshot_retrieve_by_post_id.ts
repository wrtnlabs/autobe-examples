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

/**
 * Test retrieving all historical snapshots for a specific post by filtering with post_id parameter.
 *
 * This test validates the post snapshot retrieval functionality by:
 * 1. Creating a member account and authenticating
 * 2. Creating a community for post creation
 * 3. Creating a post in the community
 * 4. Editing the post multiple times to generate multiple snapshots
 * 5. Retrieving snapshots filtered by post_id
 * 6. Validating snapshot data integrity and pagination
 */
export async function test_api_post_snapshot_retrieve_by_post_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Edit the post multiple times to generate snapshots
  const editCount = 3;
  for (let i = 0; i < editCount; i++) {
    await api.functional.redditClone.member.posts.update(memberConnection, {
      postId: post.id,
      body: {
        title: `${post.title} - Edit ${i + 1}`,
        content: `${post.content}\n\nEdit ${i + 1} content.`,
      } satisfies IRedditClonePost.IUpdate,
    });
  }
  // 5. Retrieve snapshots filtered by post_id (default: descending order)
  const snapshotsDesc = await api.functional.redditClone.post_snapshots.index(
    memberConnection,
    {
      body: {
        post_id: post.id,
        sort_direction: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditClonePostSnapshot.IRequest,
    },
  );
  typia.assert(snapshotsDesc);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "snapshot count matches edits plus initial",
    snapshotsDesc.pagination.records,
    editCount + 1,
  );
  TestValidator.equals(
    "pagination current page",
    snapshotsDesc.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotsDesc.pagination.limit, 20);
  TestValidator.predicate(
    "total pages is at least 1",
    snapshotsDesc.pagination.pages >= 1,
  );
  // 7. Validate snapshot data array
  TestValidator.predicate(
    "snapshots data array is not empty",
    snapshotsDesc.data.length > 0,
  );
  // 8. Verify each snapshot contains correct post_id reference
  await ArrayUtil.asyncForEach(snapshotsDesc.data, async (snapshot) => {
    TestValidator.equals(
      `snapshot ${snapshot.id} has correct post_id`,
      snapshot.reddit_clone_post_id,
      post.id,
    );
  });
  // 9. Verify snapshots are ordered by captured_at in descending order
  if (snapshotsDesc.data.length > 1) {
    for (let i = 1; i < snapshotsDesc.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} captured_at is before snapshot ${i - 1}`,
        new Date(snapshotsDesc.data[i].captured_at).getTime() <=
          new Date(snapshotsDesc.data[i - 1].captured_at).getTime(),
      );
    }
  }
  // 10. Verify each snapshot preserves original_created_at from source post
  await ArrayUtil.asyncForEach(snapshotsDesc.data, async (snapshot) => {
    TestValidator.equals(
      `snapshot ${snapshot.id} preserves original_created_at`,
      snapshot.original_created_at,
      post.created_at,
    );
  });
  // 11. Verify snapshot fields reflect state at capture time
  TestValidator.predicate(
    "latest snapshot has most recent title",
    snapshotsDesc.data[0].title.includes("Edit"),
  );
  // 12. Test ascending order (oldest first)
  const snapshotsAsc = await api.functional.redditClone.post_snapshots.index(
    memberConnection,
    {
      body: {
        post_id: post.id,
        sort_direction: "asc",
        page: 1,
        limit: 20,
      } satisfies IRedditClonePostSnapshot.IRequest,
    },
  );
  typia.assert(snapshotsAsc);
  TestValidator.equals(
    "ascending order returns same record count",
    snapshotsAsc.pagination.records,
    snapshotsDesc.pagination.records,
  );
  if (snapshotsAsc.data.length > 1) {
    for (let i = 1; i < snapshotsAsc.data.length; i++) {
      TestValidator.predicate(
        `ascending: snapshot ${i} captured_at is after snapshot ${i - 1}`,
        new Date(snapshotsAsc.data[i].captured_at).getTime() >=
          new Date(snapshotsAsc.data[i - 1].captured_at).getTime(),
      );
    }
  }
  // 13. Verify oldest snapshot (first in ascending order) has original title
  TestValidator.predicate(
    "oldest snapshot has original title without edit suffix",
    !snapshotsAsc.data[0].title.includes("Edit"),
  );
  // 14. Test pagination with specific limit
  const paginatedSnapshots =
    await api.functional.redditClone.post_snapshots.index(memberConnection, {
      body: {
        post_id: post.id,
        limit: 2,
        page: 1,
      } satisfies IRedditClonePostSnapshot.IRequest,
    });
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "paginated limit is 2",
    paginatedSnapshots.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "paginated data array has at most 2 items",
    paginatedSnapshots.data.length <= 2,
  );
  TestValidator.equals(
    "paginated records match total count",
    paginatedSnapshots.pagination.records,
    snapshotsDesc.pagination.records,
  );
}
