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

export async function test_api_post_revisions_retrieve_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create a post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  const revisionCount = 3;
  // 3. Create revisions by editing the post multiple times
  const expectedRevisions: {
    title: string;
    content: string;
    revisionNumber: number;
    type: "text" | "link" | "image";
  }[] = [
    {
      title: post.title,
      content: post.content!,
      revisionNumber: 1,
      type: post.type,
    },
  ];
  for (let i = 2; i <= revisionCount; i++) {
    const newTitle = RandomGenerator.name(3);
    const newContent = RandomGenerator.paragraph({ sentences: 5 });
    await api.functional.redditLike.member.posts.update(memberConnection, {
      postId: post.id,
      body: {
        title: newTitle,
        content: newContent,
      } satisfies IRedditLikePost.IUpdate,
    });
    expectedRevisions.push({
      title: newTitle,
      content: newContent,
      revisionNumber: i,
      type: post.type,
    });
  }
  // 4. Retrieve revisions with pagination
  const result = await api.functional.redditLike.member.posts.revisions.index(
    memberConnection,
    {
      postId: post.id,
      body: { page: 1, limit: 10 } satisfies IRedditLikePostRevision.IRequest,
    },
  );
  typia.assert(result);
  // 5. Validate results
  TestValidator.equals(
    "revision count matches",
    result.data.length,
    revisionCount,
  );
  TestValidator.equals(
    "total records matches",
    result.pagination.records,
    revisionCount,
  );
  // 6. Validate chronological order and content
  for (let i = 0; i < result.data.length; i++) {
    const revision = result.data[i];
    const expected = expectedRevisions[i];
    TestValidator.equals(
      `revision ${i + 1} number`,
      revision.revision_number,
      expected.revisionNumber,
    );
    TestValidator.equals(
      `revision ${i + 1} title`,
      revision.title,
      expected.title,
    );
    TestValidator.equals(
      `revision ${i + 1} content`,
      revision.content,
      expected.content,
    );
    TestValidator.equals(
      `revision ${i + 1} type`,
      revision.type,
      expected.type,
    );
    // Validate author summary
    if (revision.author) {
      TestValidator.predicate(
        `revision ${i + 1} has username`,
        typeof revision.author.username === "string",
      );
      TestValidator.predicate(
        `revision ${i + 1} has display_name`,
        typeof revision.author.display_name === "string",
      );
      TestValidator.equals(
        `revision ${i + 1} author id matches member`,
        revision.author.id,
        member.id,
      );
    }
  }
  // 7. Test pagination with smaller limit
  const paginatedResult =
    await api.functional.redditLike.member.posts.revisions.index(
      memberConnection,
      {
        postId: post.id,
        body: { page: 1, limit: 2 } satisfies IRedditLikePostRevision.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "first page has 2 revisions",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination total records",
    paginatedResult.pagination.records,
    revisionCount,
  );
  TestValidator.equals("pagination pages", paginatedResult.pagination.pages, 2);
}
