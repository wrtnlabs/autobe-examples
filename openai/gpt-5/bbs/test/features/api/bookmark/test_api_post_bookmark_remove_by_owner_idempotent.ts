import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostBookmark";

export async function test_api_post_bookmark_remove_by_owner_idempotent(
  connection: api.IConnection,
) {
  /**
   * Validate member-owned post bookmark removal and idempotency, plus
   * unauthenticated rejection.
   *
   * Steps:
   *
   * 1. Register an author and create a post.
   * 2. Register a different member (bookmarker) and bookmark the post.
   * 3. Delete the bookmark (expect success).
   * 4. Delete again to confirm idempotency (expect success/no error).
   * 5. Attempt DELETE without Authorization to ensure it fails.
   */

  // 1) Author joins (SDK sets Authorization header)
  const authorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P${RandomGenerator.alphaNumeric(11)}`, // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const author = await api.functional.auth.member.join(connection, {
    body: authorJoinBody,
  });
  typia.assert(author);

  // 2) Author creates a post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "created post should be authored by the creator",
    post.author_user_id,
    author.id,
  );

  // 3) Bookmarker joins (switches session)
  const bookmarkerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P${RandomGenerator.alphaNumeric(11)}`,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const bookmarker = await api.functional.auth.member.join(connection, {
    body: bookmarkerJoinBody,
  });
  typia.assert(bookmarker);

  // 4) Bookmarker creates a bookmark on the author's post
  const bookmarkCreateBody = {
    note: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPostBookmark.ICreate;
  await api.functional.econDiscuss.member.posts.bookmarks.create(connection, {
    postId: post.id,
    body: bookmarkCreateBody,
  });

  // 5) Remove the bookmark
  await api.functional.econDiscuss.member.posts.bookmarks.self.erase(
    connection,
    {
      postId: post.id,
    },
  );

  // 6) Repeat delete to confirm idempotency (no error expected)
  await api.functional.econDiscuss.member.posts.bookmarks.self.erase(
    connection,
    {
      postId: post.id,
    },
  );

  // 7) Negative: unauthenticated should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot remove a bookmark",
    async () => {
      await api.functional.econDiscuss.member.posts.bookmarks.self.erase(
        unauthConn,
        { postId: post.id },
      );
    },
  );
}
