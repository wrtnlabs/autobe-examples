import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function test_api_post_soft_delete_by_author(
  connection: api.IConnection,
) {
  /**
   * Validate author soft-deletion with authorization boundaries.
   *
   * Steps:
   *
   * 1. Unauthenticated boundary: ensure erase rejects unauthenticated caller.
   * 2. Member A joins and creates a post; verify ownership.
   * 3. Member B attempts to erase Member A's post and is rejected.
   * 4. Member A erases their own post successfully (soft-delete).
   *
   * Note: No public GET endpoint is available to confirm 404 after deletion, so
   * we validate via permission boundaries and successful erase call.
   */
  // 1) Unauthenticated boundary: erase must reject when unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("unauthenticated erase must fail", async () => {
    await api.functional.econDiscuss.member.posts.erase(unauthConn, {
      postId: randomPostId,
    });
  });

  // 2) Member A joins
  const memberABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberA: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberABody });
  typia.assert(memberA);

  // Member A creates a post
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: createPostBody,
    });
  typia.assert(post);

  // Verify ownership
  TestValidator.equals(
    "created post belongs to author (Member A)",
    post.author_user_id,
    memberA.id,
  );

  // 3) Member B joins on a separate connection and attempts to erase Member A's post
  const memberBConn: api.IConnection = { ...connection, headers: {} };
  const memberBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberB: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(memberBConn, { body: memberBBody });
  typia.assert(memberB);

  // Cross-account erase must fail
  await TestValidator.error(
    "other member cannot erase author's post",
    async () => {
      await api.functional.econDiscuss.member.posts.erase(memberBConn, {
        postId: post.id,
      });
    },
  );

  // 4) Author (Member A) erases own post successfully
  await api.functional.econDiscuss.member.posts.erase(connection, {
    postId: post.id,
  });
}
