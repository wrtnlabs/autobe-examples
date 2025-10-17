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

/**
 * Validate soft-deletion of a vote by its owner and idempotency of the delete.
 *
 * Steps:
 *
 * 1. Administrator registers and creates a category.
 * 2. Registered user (owner) registers and becomes the acting user.
 * 3. Owner creates a thread in the admin-created category.
 * 4. Owner creates a post in the thread.
 * 5. Owner casts a vote on the post and captures the vote id.
 * 6. Owner deletes the vote via the erase endpoint and verifies idempotency by
 *    calling erase twice (both must not throw).
 * 7. To observe a visible effect, the owner attempts to cast a new vote after
 *    deletion — the API should accept it (either by creating a new vote or by
 *    reactivating an existing record). All non-void responses are validated
 *    with typia.assert().
 */
export async function test_api_vote_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // 1) Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: "AdminPassw0rd!", // >= 10 chars
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2) Admin creates a category
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`.toLowerCase(),
    is_moderated: false,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3) Owner registers (registered user join) -> this call will mutate connection.headers
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: ownerEmail,
    password: "UserPassw0rd!", // >= 10 chars
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: ownerBody,
    });
  typia.assert(owner);

  // 4) Owner creates a thread in the admin-created category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    slug: `thr-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);
  TestValidator.equals(
    "thread belongs to created category",
    thread.category_id,
    category.id,
  );

  // 5) Owner creates a post in the thread
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals("post belongs to thread", post.thread_id, thread.id);

  // 6) Owner casts a vote on the post
  const voteCreateBody = {
    post_id: post.id,
    value: 1 as 1,
  } satisfies IEconPoliticalForumVote.ICreate;

  const vote: IEconPoliticalForumVote =
    await api.functional.econPoliticalForum.registeredUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);
  TestValidator.equals("vote is for the expected post", vote.post_id, post.id);
  TestValidator.equals("vote value is upvote", vote.value, 1 as 1);

  // 7) Owner deletes the vote (erase) and verifies idempotency
  let firstDeleteOk = false;
  let secondDeleteOk = false;

  try {
    await api.functional.econPoliticalForum.registeredUser.posts.votes.erase(
      connection,
      {
        postId: post.id,
        voteId: vote.id,
      },
    );
    firstDeleteOk = true;
  } catch (err) {
    firstDeleteOk = false;
  }

  try {
    // second call should be idempotent (not throw)
    await api.functional.econPoliticalForum.registeredUser.posts.votes.erase(
      connection,
      {
        postId: post.id,
        voteId: vote.id,
      },
    );
    secondDeleteOk = true;
  } catch (err) {
    secondDeleteOk = false;
  }

  TestValidator.predicate(
    "vote delete idempotent (both attempts succeeded without throwing)",
    firstDeleteOk && secondDeleteOk,
  );

  // 8) Pragmatic observable verification: attempt to cast a new vote after deletion
  const newVoteBody = {
    post_id: post.id,
    value: 1 as 1,
  } satisfies IEconPoliticalForumVote.ICreate;

  const newVote: IEconPoliticalForumVote =
    await api.functional.econPoliticalForum.registeredUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: newVoteBody,
      },
    );
  typia.assert(newVote);

  // If possible, assert vote ids differ (most likely the backend creates a new record when the previous was soft-deleted)
  TestValidator.notEquals(
    "new vote id differs from deleted vote id",
    vote.id,
    newVote.id,
  );
}
