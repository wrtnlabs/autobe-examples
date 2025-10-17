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

export async function test_api_vote_update_change_value_and_idempotency(
  connection: api.IConnection,
) {
  /**
   * End-to-end test for updating a vote on a forum post:
   *
   * - Admin creates a category
   * - Registered user A creates a thread and post
   * - Registered user A casts an initial upvote
   * - Registered user A updates vote to downvote (-1)
   * - Verify idempotency by repeating update and by re-creating the same vote
   * - Simulate concurrent updates and verify single canonical vote id
   * - Verify ownership enforcement: user B cannot update user A's vote
   */

  // --- Setup: admin and category ---
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "adminPassword123",
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const categoryCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_moderated: false,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // --- Setup: registered user A, thread, post ---
  const userConn: api.IConnection = { ...connection, headers: {} };
  const userJoinBody = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "userPassword123",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userConn, {
      body: userJoinBody,
    });
  typia.assert(user);

  const threadCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    slug: RandomGenerator.alphaNumeric(12).toLowerCase(),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userConn,
      { body: threadCreateBody },
    );
  typia.assert(thread);

  const postCreateBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      userConn,
      { body: postCreateBody },
    );
  typia.assert(post);

  // --- Step: initial vote (value = 1) by user A ---
  const voteCreateBody = {
    post_id: post.id,
    value: 1,
  } satisfies IEconPoliticalForumVote.ICreate;

  const initialVote: IEconPoliticalForumVote =
    await api.functional.econPoliticalForum.registeredUser.posts.votes.create(
      userConn,
      {
        postId: post.id,
        body: voteCreateBody,
      },
    );
  typia.assert(initialVote);
  TestValidator.equals("initial vote value is 1", initialVote.value, 1);

  // --- Step: update vote to -1 (owner) ---
  const updatedVote: IEconPoliticalForumVote =
    await api.functional.econPoliticalForum.registeredUser.posts.votes.update(
      userConn,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: { value: -1 } satisfies IEconPoliticalForumVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals("updated vote value is -1", updatedVote.value, -1);

  // Verify timestamp changed
  TestValidator.notEquals(
    "updated_at changed after update",
    initialVote.updated_at,
    updatedVote.updated_at,
  );

  // --- Idempotency: repeat same PUT ---
  const updatedAgain: IEconPoliticalForumVote =
    await api.functional.econPoliticalForum.registeredUser.posts.votes.update(
      userConn,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: { value: -1 } satisfies IEconPoliticalForumVote.IUpdate,
      },
    );
  typia.assert(updatedAgain);
  TestValidator.equals(
    "idempotent update preserves id",
    updatedAgain.id,
    updatedVote.id,
  );
  TestValidator.equals(
    "value remains -1 after idempotent update",
    updatedAgain.value,
    -1,
  );

  // --- Re-create same vote via POST to check uniqueness/no-duplicates ---
  const recreateVote: IEconPoliticalForumVote =
    await api.functional.econPoliticalForum.registeredUser.posts.votes.create(
      userConn,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          value: -1,
        } satisfies IEconPoliticalForumVote.ICreate,
      },
    );
  typia.assert(recreateVote);
  TestValidator.equals(
    "create with same user/post returns canonical vote id",
    recreateVote.id,
    updatedVote.id,
  );

  // --- Concurrency: parallel toggling updates ---
  const concurrentPromises = ArrayUtil.repeat(10, (i) => {
    const val = (i % 2 === 0 ? 1 : -1) as 1 | -1;
    return api.functional.econPoliticalForum.registeredUser.posts.votes.update(
      userConn,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: { value: val } satisfies IEconPoliticalForumVote.IUpdate,
      },
    );
  });

  const concurrentResults = await Promise.all(concurrentPromises);
  concurrentResults.forEach((r) => typia.assert(r));

  TestValidator.predicate(
    "concurrent updates refer to same vote id",
    concurrentResults.every((r) => r.id === initialVote.id),
  );

  // Final state from the last concurrent result should be a valid domain value
  const finalConcurrent = concurrentResults[concurrentResults.length - 1];
  TestValidator.predicate(
    "final concurrent vote value is 1 or -1",
    finalConcurrent.value === 1 || finalConcurrent.value === -1,
  );

  // --- Ownership enforcement: another user (user B) cannot update user A's vote ---
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const otherJoinBody = {
    username: `other_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "otherPassword123",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const otherUser: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(otherConn, {
      body: otherJoinBody,
    });
  typia.assert(otherUser);

  await TestValidator.error(
    "other user cannot update someone else's vote",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.posts.votes.update(
        otherConn,
        {
          postId: post.id,
          voteId: initialVote.id,
          body: { value: 1 } satisfies IEconPoliticalForumVote.IUpdate,
        },
      );
    },
  );

  // --- End of test: rely on isolated test DB or transactional rollback for cleanup ---
}
