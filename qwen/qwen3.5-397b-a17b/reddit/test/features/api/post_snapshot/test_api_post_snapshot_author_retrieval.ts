import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";

export async function test_api_post_snapshot_author_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Create initial text post
  const originalTitle = RandomGenerator.paragraph({ sentences: 1 });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: originalBody,
        } satisfies IRedditClonePostText.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Modify post multiple times to create snapshots
  const modificationCount = 3;
  const allTitles: string[] = [originalTitle];
  for (let i = 0; i < modificationCount; i++) {
    const newTitle = `Modified Title ${i + 1} - ${RandomGenerator.alphabets(5)}`;
    const newBody = `Modified body content ${i + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`;
    const updatedPost = await api.functional.redditClone.member.posts.update(
      memberConnection,
      {
        postId: post.id,
        body: {
          title: newTitle,
          text: newBody,
        } satisfies IRedditClonePost.IUpdate,
      },
    );
    typia.assert(updatedPost);
    allTitles.push(newTitle);
  }
  // 5. Retrieve snapshot history (default: reverse chronological order)
  const snapshotResponse =
    await api.functional.redditClone.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 100,
          sort: "created_at",
          direction: "desc",
        } satisfies IRedditClonePostSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 6. Validate pagination info
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    snapshotResponse.pagination.limit > 0,
  );
  // 7. Verify snapshot count (original creation + modifications)
  const expectedSnapshotCount = modificationCount + 1;
  TestValidator.equals(
    "snapshot count matches modifications + original",
    snapshotResponse.data.length,
    expectedSnapshotCount,
  );
  TestValidator.equals(
    "total records in pagination",
    snapshotResponse.pagination.records,
    expectedSnapshotCount,
  );
  // 8. Validate each snapshot has required fields
  const snapshots = snapshotResponse.data;
  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    // Validate required fields exist
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate("snapshot has title", snapshot.title !== undefined);
    TestValidator.predicate(
      "snapshot has post_type",
      snapshot.post_type !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has author",
      snapshot.author !== undefined,
    );
    // Validate author information
    TestValidator.predicate("author has id", snapshot.author.id !== undefined);
    TestValidator.predicate(
      "author has username",
      snapshot.author.username !== undefined,
    );
    TestValidator.predicate(
      "author has display_name",
      snapshot.author.display_name !== undefined,
    );
    // Validate post_type is TEXT
    TestValidator.equals("post_type is TEXT", snapshot.post_type, "TEXT");
    // Validate title matches expected (reverse chronological - newest first)
    // snapshots[0] = most recent (last modification), snapshots[last] = original
    const expectedTitleIndex = expectedSnapshotCount - 1 - i;
    TestValidator.equals(
      `snapshot ${i} title matches modification ${expectedTitleIndex}`,
      snapshot.title,
      allTitles[expectedTitleIndex],
    );
  }
  // 9. Verify reverse chronological order by created_at timestamps
  for (let i = 0; i < snapshots.length - 1; i++) {
    const currentSnapshot = snapshots[i];
    const nextSnapshot = snapshots[i + 1];
    TestValidator.predicate(
      `snapshot ${i} is newer than or equal to snapshot ${i + 1}`,
      new Date(currentSnapshot.created_at).getTime() >=
        new Date(nextSnapshot.created_at).getTime(),
    );
  }
}
