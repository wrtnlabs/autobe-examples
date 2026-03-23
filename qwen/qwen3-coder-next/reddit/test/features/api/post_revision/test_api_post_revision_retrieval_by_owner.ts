import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
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

/**
 * Test member retrieves a specific revision of a post they created.
 * 1. Member registers and logs in
 * 2. Member creates a text post
 * 3. Member creates a revision snapshot of the post
 * 4. Member retrieves the specific revision
 * 5. Validate revision data matches expected values
 */
export async function test_api_post_revision_retrieval_by_owner(
  connection: IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a new post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Test post for revision history",
        type: "text" as const,
        content: "Initial content of the post",
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a revision snapshot
  await generate_random_reddit_like_member_posts_revisions_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        title: "Updated title for revision",
        content: "Updated content of the post",
      } satisfies IRedditLikePostRevision.ICreate,
    },
  );
  // 4. Retrieve the specific revision (revision number 1)
  const revision = await api.functional.redditLike.member.posts.revisions.at(
    memberConnection,
    {
      postId: post.id,
      revisionId: 1,
    },
  );
  typia.assert(revision);
  // 5. Validate revision data
  TestValidator.equals(
    "revision title matches",
    revision.title,
    "Updated title for revision",
  );
  TestValidator.equals(
    "revision content matches",
    revision.content,
    "Updated content of the post",
  );
  TestValidator.equals("revision number is 1", revision.revision_number, 1);
  TestValidator.predicate(
    "revision has valid timestamp",
    revision.created_at !== undefined,
  );
}
