import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Verify that an authenticated author can update their own post, and that other
 * users cannot update it.
 *
 * Steps
 *
 * 1. Member A joins (receives auth token via SDK header management)
 * 2. Member A creates a post
 * 3. Member A updates the post (title/body/summary). Validate:
 *
 *    - Author_user_id unchanged and equals Member A id
 *    - Updated fields reflect the request
 *    - Updated_at > previous updated timestamp and created_at unchanged
 * 4. Member B joins and attempts to update Member A's post → expect error
 */
export async function test_api_post_update_by_author(
  connection: api.IConnection,
) {
  // 1) Member A joins
  const authorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const author = await api.functional.auth.member.join(connection, {
    body: authorJoinBody,
  });
  typia.assert<IEconDiscussMember.IAuthorized>(author);

  // 2) Member A creates a post
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
    summary: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IEconDiscussPost.ICreate;
  const created = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert<IEconDiscussPost>(created);

  // Basic ownership verification
  TestValidator.equals(
    "author id of created post matches member A",
    created.author_user_id,
    author.id,
  );

  // 3) Member A updates the post
  // (Small delay to ensure updated_at becomes greater than previous timestamp)
  await new Promise((resolve) => setTimeout(resolve, 5));

  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 8,
    }),
    summary: null, // clear the summary
  } satisfies IEconDiscussPost.IUpdate;
  const updated = await api.functional.econDiscuss.member.posts.update(
    connection,
    {
      postId: created.id,
      body: updateBody,
    },
  );
  typia.assert<IEconDiscussPost>(updated);

  // Validate updates
  TestValidator.equals(
    "author id remains unchanged after update",
    updated.author_user_id,
    author.id,
  );
  TestValidator.equals(
    "title updated to requested value",
    updated.title,
    updateBody.title,
  );
  TestValidator.equals(
    "body updated to requested value",
    updated.body,
    updateBody.body,
  );
  TestValidator.equals("summary cleared to null", updated.summary, null);

  // created_at should be stable, updated_at should advance
  TestValidator.equals(
    "created_at unchanged after update",
    updated.created_at,
    created.created_at,
  );
  const prevUpdatedMs = Date.parse(created.updated_at);
  const newUpdatedMs = Date.parse(updated.updated_at);
  TestValidator.predicate(
    "updated_at is greater than previous updated timestamp",
    newUpdatedMs > prevUpdatedMs,
  );

  // Also confirm content actually changed
  TestValidator.notEquals(
    "title actually changed from original",
    updated.title,
    createBody.title,
  );
  TestValidator.notEquals(
    "body actually changed from original",
    updated.body,
    createBody.body,
  );

  // 4) Member B joins and attempts forbidden update
  const intruderJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const intruder = await api.functional.auth.member.join(connection, {
    body: intruderJoinBody,
  });
  typia.assert<IEconDiscussMember.IAuthorized>(intruder);

  // Non-author should not be able to update Member A's post
  await TestValidator.error(
    "non-author cannot update another user's post",
    async () => {
      await api.functional.econDiscuss.member.posts.update(connection, {
        postId: created.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 10,
          }),
        } satisfies IEconDiscussPost.IUpdate,
      });
    },
  );
}
