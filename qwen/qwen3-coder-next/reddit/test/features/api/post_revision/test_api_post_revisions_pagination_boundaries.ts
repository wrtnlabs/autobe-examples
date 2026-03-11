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

export async function test_api_post_revisions_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  const REVISION_COUNT: number = 15;
  const LIMIT: number = 5;
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create post
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create multiple revisions by updating post
  for (let i = 0; i < REVISION_COUNT; i++) {
    await api.functional.redditLike.member.posts.update(memberConnection, {
      postId: post.id,
      body: {
        title: `${post.title} (rev ${i + 1})`,
        content: RandomGenerator.paragraph({ sentences: 5 + i }),
      } satisfies IRedditLikePost.IUpdate,
    });
  }
  // 4. Test pagination boundaries
  // 4.1. First page
  const firstPage =
    await api.functional.redditLike.member.posts.revisions.index(
      memberConnection,
      {
        postId: post.id,
        body: { page: 1, limit: LIMIT },
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page count", firstPage.data.length, LIMIT);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, LIMIT);
  TestValidator.equals(
    "first page records",
    firstPage.pagination.records,
    REVISION_COUNT,
  );
  TestValidator.equals(
    "first page pages",
    firstPage.pagination.pages,
    Math.ceil(REVISION_COUNT / LIMIT),
  );
  // 4.2. Last page
  const totalPages: number = Math.ceil(REVISION_COUNT / LIMIT);
  const lastPage = await api.functional.redditLike.member.posts.revisions.index(
    memberConnection,
    {
      postId: post.id,
      body: { page: totalPages, limit: LIMIT },
    },
  );
  typia.assert(lastPage);
  const expectedLastPageCount: number =
    REVISION_COUNT % LIMIT === 0 ? LIMIT : REVISION_COUNT % LIMIT;
  TestValidator.equals(
    "last page count",
    lastPage.data.length,
    expectedLastPageCount,
  );
  TestValidator.equals(
    "last page current",
    lastPage.pagination.current,
    totalPages,
  );
  TestValidator.equals(
    "last page records",
    lastPage.pagination.records,
    REVISION_COUNT,
  );
  TestValidator.equals(
    "last page pages",
    lastPage.pagination.pages,
    totalPages,
  );
  // 4.3. Page beyond available pages
  const beyondPage =
    await api.functional.redditLike.member.posts.revisions.index(
      memberConnection,
      {
        postId: post.id,
        body: { page: totalPages + 1, limit: LIMIT },
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page data length", beyondPage.data.length, 0);
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    totalPages + 1,
  );
  TestValidator.equals(
    "beyond page records",
    beyondPage.pagination.records,
    REVISION_COUNT,
  );
  TestValidator.equals(
    "beyond page pages",
    beyondPage.pagination.pages,
    totalPages,
  );
  // 4.4. Post with no revisions
  const newPost = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(newPost);
  const emptyPage =
    await api.functional.redditLike.member.posts.revisions.index(
      memberConnection,
      {
        postId: newPost.id,
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 1);
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
  // 4.5. Limit boundaries
  const minLimitPage =
    await api.functional.redditLike.member.posts.revisions.index(
      memberConnection,
      {
        postId: post.id,
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals("min limit page count", minLimitPage.data.length, 1);
  const maxLimitPage =
    await api.functional.redditLike.member.posts.revisions.index(
      memberConnection,
      {
        postId: post.id,
        body: { page: 1, limit: 100 },
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page count",
    maxLimitPage.data.length,
    REVISION_COUNT,
  );
}
