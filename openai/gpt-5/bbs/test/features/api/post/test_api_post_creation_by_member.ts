import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function test_api_post_creation_by_member(
  connection: api.IConnection,
) {
  /**
   * Validate successful post creation by an authenticated member.
   *
   * Steps:
   *
   * 1. Join as a member to obtain an authenticated session (SDK manages token).
   * 2. Create a post with title/body and optional summary.
   * 3. Validate server-managed fields and ownership:
   *
   *    - Response matches IEconDiscussPost (typia.assert)
   *    - Author_user_id equals authenticated member id
   *    - Title/body echo inputs; summary is preserved when provided
   *    - Created_at/updated_at are ISO timestamps and created_at <= updated_at
   *    - Accept implementation policy for published_at (null/undefined or set)
   */

  // 1) Join as member (authenticate)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password#1234", // >= 8 chars
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Optional subject consistency check when present
  if (authorized.member !== undefined) {
    TestValidator.equals(
      "authorized.member.id should equal authorized.id",
      authorized.member.id,
      authorized.id,
    );
  }

  // 2) Create a post as the authenticated member
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;

  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    { body: createPostBody },
  );
  typia.assert(post);

  // 3) Validate ownership and server-managed fields
  TestValidator.equals(
    "author_user_id must match authenticated member id",
    post.author_user_id,
    authorized.id,
  );
  TestValidator.equals(
    "title should echo input",
    post.title,
    createPostBody.title,
  );
  TestValidator.equals(
    "body should echo input",
    post.body,
    createPostBody.body,
  );

  // summary may be nullable/undefinable by implementation; if present, it must match
  TestValidator.predicate(
    "summary preserved when provided (or nullish by policy)",
    post.summary === null || post.summary === undefined
      ? true
      : post.summary === createPostBody.summary,
  );

  // created_at/updated_at must be chronological (created_at <= updated_at)
  const createdAtMs: number = Date.parse(post.created_at);
  const updatedAtMs: number = Date.parse(post.updated_at);
  TestValidator.predicate(
    "created_at should be earlier than or equal to updated_at",
    createdAtMs <= updatedAtMs,
  );

  // published_at acceptance per policy: allow null/undefined or a valid date-time (already type-asserted)
  TestValidator.predicate(
    "published_at follows implementation policy (nullish or date-time)",
    post.published_at === null ||
      post.published_at === undefined ||
      typeof post.published_at === "string",
  );
}
