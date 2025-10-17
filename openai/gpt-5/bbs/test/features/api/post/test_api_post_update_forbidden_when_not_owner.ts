import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Enforce ownership on post updates: non-owner must not update another user’s
 * post.
 *
 * Scenario:
 *
 * 1. Join as Member A.
 * 2. Create a post as Member A and confirm authorship.
 * 3. Join as Member B (switches Authorization to B).
 * 4. Attempt to update Member A’s post using Member B’s session — expect error.
 *
 * Rules:
 *
 * - Use proper DTO variants (ICreate for creation, IUpdate for update).
 * - Validate responses with typia.assert().
 * - Use TestValidator.error without asserting specific HTTP status codes.
 * - Never touch connection.headers manually; the SDK manages tokens.
 */
export async function test_api_post_update_forbidden_when_not_owner(
  connection: api.IConnection,
) {
  // 1) Join as Member A
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberA);

  // 2) Create a post as Member A
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
    }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;

  const created = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(created);

  // Confirm authorship
  TestValidator.equals(
    "created post author should be member A",
    created.author_user_id,
    memberA.id,
  );

  // 3) Join as Member B (Authorization switches automatically)
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(memberB);

  TestValidator.notEquals(
    "member B id must differ from member A id",
    memberB.id,
    memberA.id,
  );

  // 4) Attempt to update A's post using B's session — expect error
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 12,
    }),
  } satisfies IEconDiscussPost.IUpdate;

  await TestValidator.error(
    "non-owner cannot update another user's post",
    async () => {
      await api.functional.econDiscuss.member.posts.update(connection, {
        postId: created.id,
        body: updateBody,
      });
    },
  );
}
