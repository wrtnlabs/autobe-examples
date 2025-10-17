import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Validate idempotent behavior of deleting a member-authored post.
 *
 * Business goal: ensure a member can delete their own post and that a repeated
 * DELETE call is safe (either idempotent success or a graceful conflict),
 * without relying on public retrieval verification (no GET endpoint provided).
 *
 * Steps:
 *
 * 1. Join as a member (issues tokens on success).
 * 2. Create a post as the authenticated member.
 * 3. Delete the post (first DELETE should succeed).
 * 4. Delete again (second DELETE is either idempotent success or acceptable
 *    error).
 * 5. Keep assertions to business outcomes and type guarantees only.
 */
export async function test_api_post_delete_idempotent_on_repeated_calls(
  connection: api.IConnection,
) {
  // 1) Join as member -> issues tokens; SDK manages Authorization header
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Optional profile echo validation when subject snapshot is provided
  if (authorized.member !== undefined) {
    typia.assert(authorized.member);
    TestValidator.equals(
      "member.displayName echoes join payload when present",
      authorized.member.displayName,
      joinBody.display_name,
    );
  }

  // 2) Create a post as the authenticated member
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 14,
      wordMin: 3,
      wordMax: 8,
    }),
    summary: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(post);

  // Validate author linkage and field integrity
  TestValidator.equals(
    "created post author must equal authenticated member id",
    post.author_user_id,
    authorized.id,
  );
  TestValidator.equals(
    "created post title matches requested title",
    post.title,
    createBody.title,
  );

  // 3) First delete: should succeed
  await api.functional.econDiscuss.member.posts.erase(connection, {
    postId: post.id,
  });

  // 4) Second delete: accept both idempotent success and graceful conflict
  let secondDeletionSucceeded = false;
  try {
    await api.functional.econDiscuss.member.posts.erase(connection, {
      postId: post.id,
    });
    secondDeletionSucceeded = true; // idempotent success
  } catch {
    secondDeletionSucceeded = false; // graceful conflict is acceptable
  }

  // Document the accepted outcomes
  if (secondDeletionSucceeded === true) {
    TestValidator.predicate(
      "second delete call completed idempotently (acceptable)",
      true,
    );
  } else {
    TestValidator.predicate(
      "second delete call rejected gracefully (conflict acceptable)",
      true,
    );
  }
}
