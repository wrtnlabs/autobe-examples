import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IEconPoliticalForumVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumVote";

export async function test_api_vote_soft_delete_forbidden_by_other_user(
  connection: api.IConnection,
) {
  /**
   * Validate that a non-owner registered user cannot soft-delete another user's
   * vote.
   *
   * Steps:
   *
   * 1. Administrator signs up and creates a category.
   * 2. Owner (registered user A) signs up, creates a thread and a post, and casts
   *    a vote.
   * 3. Non-owner (registered user B) signs up and attempts to delete the owner's
   *    vote -> expect an error (forbidden).
   *
   * Limitations:
   *
   * - The provided SDK does NOT expose a GET-vote or audit-log endpoint.
   *   Therefore the test cannot perform direct DB verification or read audit
   *   logs. To achieve full DB/audit verification, add read endpoints for votes
   *   and audit logs to the SDK.
   *
   * What this test verifies:
   *
   * - The erase() call from a non-owner throws (caught by TestValidator.error).
   * - The created vote object (response from create) initially indicates an
   *   active vote (deleted_at is null or undefined). This is a partial
   *   verification in absence of read endpoints.
   */

  // Administrator sign-up
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Create category (admin context)
  const categoryBody = {
    code: null,
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphabets(8),
    description: null,
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // Owner (registered user A) signs up
  const ownerBody = {
    username: `owner_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: ownerBody,
    });
  typia.assert(owner);

  // Owner creates thread
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: RandomGenerator.alphabets(8),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  // Owner creates post
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // Owner casts a vote on the post
  const voteBody = {
    post_id: post.id,
    value: 1 as 1,
  } satisfies IEconPoliticalForumVote.ICreate;

  const vote: IEconPoliticalForumVote =
    await api.functional.econPoliticalForum.registeredUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteBody,
      },
    );
  typia.assert(vote);

  // Basic sanity: the created vote should be active (deleted_at null or undefined)
  TestValidator.predicate(
    "created vote is active (returned deleted_at is null or undefined)",
    vote.deleted_at === null || vote.deleted_at === undefined,
  );

  // Non-owner (registered user B) signs up
  const nonOwnerBody = {
    username: `other_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const nonOwner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: nonOwnerBody,
    });
  typia.assert(nonOwner);

  // Non-owner attempts to delete the owner's vote -> expect the call to throw
  await TestValidator.error(
    "non-owner cannot delete another user's vote (should throw / be forbidden)",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.posts.votes.erase(
        connection,
        {
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );

  // Post-condition: local snapshot still indicates vote active. This is a
  // limited check because the SDK lacks a GET-vote endpoint; for robust DB
  // verification, add a read endpoint (GET /econPoliticalForum/registeredUser/posts/{postId}/votes/{voteId})
  // or an audit-log API so tests can assert deleted_at remained null in storage.
  TestValidator.predicate(
    "local snapshot: vote remains active after forbidden delete attempt",
    vote.deleted_at === null || vote.deleted_at === undefined,
  );

  // End of test. Cleanup: none performed here. CI environments should reset DB
  // state between test suites to avoid side effects.
}
