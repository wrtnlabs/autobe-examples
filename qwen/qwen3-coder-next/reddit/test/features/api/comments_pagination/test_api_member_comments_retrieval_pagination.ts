import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_comments_retrieval_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // Create post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Create 25 comments for pagination testing
  const comments = await ArrayUtil.asyncRepeat(25, async (index) => {
    return await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  });
  typia.assert(comments);
  // First pagination request with limit=10, offset=0
  const firstPage = await api.functional.redditLike.member.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as any,
        offset: 0 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0> as any,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(firstPage);
  // Verify first page results
  TestValidator.equals("first page has 10 comments", firstPage.data.length, 10);
  TestValidator.equals(
    "first page pagination records",
    firstPage.pagination.records,
    25,
  );
  TestValidator.equals(
    "first page pagination limit",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "first page pagination current",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page pagination pages",
    firstPage.pagination.pages,
    3,
  );
  // Second pagination request with limit=10, offset=10
  const secondPage =
    await api.functional.redditLike.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as any,
          offset: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as any,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(secondPage);
  // Verify second page results
  TestValidator.equals(
    "second page has 10 comments",
    secondPage.data.length,
    10,
  );
  TestValidator.equals(
    "second page pagination records",
    secondPage.pagination.records,
    25,
  );
  TestValidator.equals(
    "second page pagination limit",
    secondPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "second page pagination current",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page pagination pages",
    secondPage.pagination.pages,
    3,
  );
  // Verify pagination continuity (no overlap between pages)
  const firstPageIds = firstPage.data.map((c) => c.id);
  const secondPageIds = secondPage.data.map((c) => c.id);
  const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
  TestValidator.equals("no overlap between pages", overlap.length, 0);
}
