import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostRevision";
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
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_revisions_author_inclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(2),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(author);
  // 2. Create a post (creates first revision)
  const post = await api.functional.redditLike.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Get revisions - first revision should include author summary
  const revisions1 =
    await api.functional.redditLike.member.posts.revisions.index(
      authorConnection,
      {
        postId: post.id,
        body: { page: 1, limit: 10 } satisfies IRedditLikePostRevision.IRequest,
      },
    );
  typia.assert(revisions1);
  // Validate first revision has author summary with required fields
  TestValidator.equals(
    "first revision exists",
    revisions1.data.length >= 1,
    true,
  );
  const firstRevision = revisions1.data[0];
  typia.assert(firstRevision);
  // Author summary validation
  TestValidator.equals(
    "author id exists",
    typeof firstRevision.author?.id,
    "string",
  );
  TestValidator.equals(
    "author username exists",
    typeof firstRevision.author?.username,
    "string",
  );
  TestValidator.equals(
    "author display_name exists",
    typeof firstRevision.author?.display_name,
    "string",
  );
  TestValidator.equals(
    "author karma_score exists",
    typeof firstRevision.author?.karma_score,
    "number",
  );
  TestValidator.equals(
    "author created_at exists",
    typeof firstRevision.author?.created_at,
    "string",
  );
  // 4. Update the post (creates second revision)
  const updatedPost = await api.functional.redditLike.member.posts.update(
    authorConnection,
    {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 4 }),
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 5. Get revisions again - should have two revisions
  const revisions2 =
    await api.functional.redditLike.member.posts.revisions.index(
      authorConnection,
      {
        postId: post.id,
        body: { page: 1, limit: 10 } satisfies IRedditLikePostRevision.IRequest,
      },
    );
  typia.assert(revisions2);
  // Validate revision count increased
  TestValidator.equals("revision count increased", revisions2.data.length, 2);
  TestValidator.notEquals(
    "revisions differ",
    revisions1.data[0]?.id,
    revisions2.data[0]?.id,
  );
  // 6. Validate second revision also has author summary
  const secondRevision = revisions2.data[0];
  TestValidator.equals(
    "second revision author id matches",
    secondRevision.author?.id,
    author.id,
  );
  TestValidator.equals(
    "second revision author username matches",
    secondRevision.author?.username,
    author.username,
  );
  TestValidator.equals(
    "second revision author display_name matches",
    secondRevision.author?.display_name,
    author.display_name,
  );
  TestValidator.equals(
    "second revision author karma_score matches",
    secondRevision.author?.karma_score,
    author.karma_score,
  );
}
