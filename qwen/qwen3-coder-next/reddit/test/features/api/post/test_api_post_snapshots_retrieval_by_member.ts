import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostSnapshot";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
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
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_snapshots_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member and create post
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // Create post to generate snapshots
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 2. Register second member to verify access control
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(otherMember);
  // 3. Retrieve snapshots (first member can access their own post snapshots)
  const snapshotsResponse =
    await api.functional.redditLike.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          limit: 10,
          offset: 0,
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate response structure and content
  // Validate pagination exists and has correct structure
  TestValidator.equals(
    "pagination current is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    snapshotsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    snapshotsResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate("has snapshots", snapshotsResponse.data.length >= 0);
  // 5. Verify snapshots contain required fields
  if (snapshotsResponse.data.length > 0) {
    const snapshot = snapshotsResponse.data[0];
    TestValidator.equals("snapshot has postId", snapshot.postId, post.id);
    TestValidator.equals("snapshot has author", snapshot.author.id, member.id);
    TestValidator.equals("snapshot has title", snapshot.title, post.title);
    TestValidator.equals("snapshot has type", snapshot.type, post.type);
    TestValidator.equals(
      "snapshot has content",
      snapshot.content,
      post.content,
    );
    // Validate date fields are valid
    TestValidator.predicate(
      "snapshot has valid createdAt",
      () => !isNaN(new Date(snapshot.createdAt).getTime()),
    );
    TestValidator.predicate(
      "snapshot has valid snapshotCreatedAt",
      () => !isNaN(new Date(snapshot.snapshotCreatedAt).getTime()),
    );
  }
}
