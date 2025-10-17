import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function test_api_post_creation_unauthenticated_rejected_401(
  connection: api.IConnection,
) {
  /**
   * Enforce authentication boundary for post creation.
   *
   * Workflow:
   *
   * 1. Create an unauthenticated connection (empty headers object).
   * 2. Build a valid IEconDiscussPost.ICreate body (title/body/summary, explicit
   *    null scheduled_publish_at).
   * 3. Attempt POST /econDiscuss/member/posts with unauthenticated connection and
   *    expect the call to fail.
   * 4. Assert only that an error occurs (no status code inspection).
   */
  const unauthConn: api.IConnection = { ...connection, headers: {} }; // do not touch headers afterwards

  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 14,
      wordMin: 3,
      wordMax: 8,
    }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
    scheduled_publish_at: null,
  } satisfies IEconDiscussPost.ICreate;

  await TestValidator.error(
    "unauthenticated post creation must be rejected",
    async () => {
      await api.functional.econDiscuss.member.posts.create(unauthConn, {
        body: createBody,
      });
    },
  );
}
