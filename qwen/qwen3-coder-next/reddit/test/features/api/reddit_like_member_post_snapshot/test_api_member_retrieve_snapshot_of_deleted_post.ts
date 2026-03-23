import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import type { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_revisions_create } from "../../../generate/generate_random_reddit_like_member_posts_revisions_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_revision } from "../../../prepare/prepare_random_reddit_like_post_revision";

export async function test_api_member_retrieve_snapshot_of_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create a post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        type: "text" as const,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create snapshot before deletion
  // Note: The revisions.create API returns void and doesn't provide snapshot ID
  await generate_random_reddit_like_member_posts_revisions_create(
    memberConnection,
    {
      body: {
        title: post.title,
        content: post.content ?? undefined,
      },
      params: {
        postId: post.id,
      },
    },
  );
  // 4. Delete the original post
  await api.functional.redditLike.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 5. Test retrieving snapshot with non-existent snapshot ID (404)
  await TestValidator.error("non-existent snapshot returns 404", async () => {
    await api.functional.redditLike.member.posts.snapshots.at(
      memberConnection,
      {
        postId: post.id,
        snapshotId: "non-existent-id",
      },
    );
  });
  // 6. Test retrieving snapshot with invalid post ID (404)
  await TestValidator.error("invalid post ID returns 404", async () => {
    await api.functional.redditLike.member.posts.snapshots.at(
      memberConnection,
      {
        postId: "invalid-post-id",
        snapshotId: "some-snapshot-id",
      },
    );
  });
  // 7. Test retrieving snapshot with valid post ID but deleted post
  // This would fail with 404 since the post doesn't exist anymore
  await TestValidator.error("deleted post snapshot returns 404", async () => {
    await api.functional.redditLike.member.posts.snapshots.at(
      memberConnection,
      {
        postId: post.id,
        snapshotId: "some-snapshot-id",
      },
    );
  });
}
