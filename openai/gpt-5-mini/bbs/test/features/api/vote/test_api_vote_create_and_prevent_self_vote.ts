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
 * End-to-end test: cast an upvote and prevent self-voting
 *
 * Business context:
 *
 * - Registered users may upvote/downvote posts. Each user may have at most one
 *   active vote per post. Authors must be prevented from voting on their own
 *   posts to avoid self-inflation.
 *
 * Steps:
 *
 * 1. Admin registers and creates a category
 * 2. Author (registered user) registers and creates a thread and a post
 * 3. Voter (another registered user) registers and casts an upvote on the post
 * 4. Assert vote record and basic aggregates via returned data
 * 5. Author attempts to vote on their own post and is forbidden (403)
 * 6. Voter retries the identical vote request (idempotent) and the vote record
 *    remains unique (no duplicate rows) — validated by comparing ids
 */
export async function test_api_vote_create_and_prevent_self_vote(
  connection: api.IConnection,
) {
  // 0. Create per-actor connections so SDK manages Authorization headers per actor
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const voterConn: api.IConnection = { ...connection, headers: {} };

  // 1. Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: adminEmail,
        password: "AdminPass1234",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates a category
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8),
    description: null,
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      { body: categoryBody },
    );
  typia.assert(category);
  TestValidator.predicate("category has id", !!category.id);

  // 3. Author registers (the post author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(authorConn, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: authorEmail,
        password: "UserPass1234",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 4. Author creates a thread in the category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: RandomGenerator.alphabets(8),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      authorConn,
      { body: threadBody },
    );
  typia.assert(thread);
  TestValidator.equals(
    "thread belongs to category",
    thread.category_id,
    category.id,
  );

  // 5. Author creates a post in the thread
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      authorConn,
      { body: postBody },
    );
  typia.assert(post);
  TestValidator.equals("post thread matches", post.thread_id, thread.id);

  // 6. Voter registers (different user)
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voter: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(voterConn, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: voterEmail,
        password: "UserPass1234",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(voter);

  // 7. Voter casts an upvote (value = 1)
  const voteRequest = {
    post_id: post.id,
    value: 1,
  } satisfies IEconPoliticalForumVote.ICreate;

  const vote: IEconPoliticalForumVote =
    await api.functional.econPoliticalForum.registeredUser.posts.votes.create(
      voterConn,
      {
        postId: post.id,
        body: voteRequest,
      },
    );
  typia.assert(vote);

  TestValidator.equals("vote references correct post", vote.post_id, post.id);
  TestValidator.equals("vote value is upvote", vote.value, 1);
  TestValidator.equals(
    "vote attributed to voter",
    vote.registereduser_id,
    voter.id,
  );

  // 8. Author attempts to vote on their own post -> expect 403 Forbidden
  await TestValidator.error("author cannot vote on own post", async () => {
    await api.functional.econPoliticalForum.registeredUser.posts.votes.create(
      authorConn,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          value: 1,
        } satisfies IEconPoliticalForumVote.ICreate,
      },
    );
  });

  // 9. Idempotent retry: Voter repeats the same vote (same value)
  const voteRepeat: IEconPoliticalForumVote =
    await api.functional.econPoliticalForum.registeredUser.posts.votes.create(
      voterConn,
      {
        postId: post.id,
        body: voteRequest,
      },
    );
  typia.assert(voteRepeat);

  // Business assertion: the vote ID should remain the same (no duplicate row created)
  TestValidator.equals(
    "idempotent vote returns same id",
    vote.id,
    voteRepeat.id,
  );

  // Additional sanity checks
  TestValidator.equals("vote repeated value stable", voteRepeat.value, 1);
  TestValidator.equals(
    "vote repeated user stable",
    voteRepeat.registereduser_id,
    voter.id,
  );

  // Note: Resource cleanup (soft-delete or database rollback) should be
  // performed by outer test harness / CI environment. This test leaves
  // created resources for server-side teardown.
}
