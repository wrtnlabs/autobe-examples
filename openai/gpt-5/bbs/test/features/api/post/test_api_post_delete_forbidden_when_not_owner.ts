import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Verify that a different authenticated user cannot delete another user's post.
 *
 * Workflow:
 *
 * 1. Join as Member A and obtain authenticated context.
 * 2. Create a post as Member A and verify author identity on the created post.
 * 3. Join as Member B (token switches to B automatically).
 * 4. Attempt to delete Member A's post as Member B and expect an error
 *    (forbidden).
 *
 * Notes:
 *
 * - We do not assert specific HTTP status codes; we only assert that an error
 *   occurs.
 * - No GET endpoint is provided, so we skip re-fetching the post. Ownership is
 *   validated via the create response and the cross-user token switch.
 */
export async function test_api_post_delete_forbidden_when_not_owner(
  connection: api.IConnection,
) {
  // 1) Join as Member A
  const memberABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `pw_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberA: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberABody });
  typia.assert(memberA);

  // 2) Create a post as Member A
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 14,
    }),
  } satisfies IEconDiscussPost.ICreate;
  const post: IEconDiscussPost =
    await api.functional.econDiscuss.member.posts.create(connection, {
      body: createPostBody,
    });
  typia.assert(post);

  // Validate ownership: author_user_id must match Member A's id
  TestValidator.equals(
    "created post author matches Member A",
    post.author_user_id,
    memberA.id,
  );

  // 3) Join as Member B (switches token to B automatically)
  const memberBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `pw_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const memberB: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBBody });
  typia.assert(memberB);

  // 4) Attempt deletion as Member B -> must error (forbidden)
  await TestValidator.error(
    "non-owner cannot delete another user's post",
    async () => {
      await api.functional.econDiscuss.member.posts.erase(connection, {
        postId: post.id,
      });
    },
  );
}
