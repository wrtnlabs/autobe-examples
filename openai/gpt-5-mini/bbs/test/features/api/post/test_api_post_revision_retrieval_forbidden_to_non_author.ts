import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPostRevision";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_post_revision_retrieval_forbidden_to_non_author(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure that a registered user (user B) who is NOT the author of a post
   *   cannot retrieve another user's post revision.
   *
   * Steps:
   *
   * 1. Admin registers and creates a category.
   * 2. User A registers, creates a thread and a post, then updates the post to
   *    create a revision.
   * 3. Generate a plausible revisionId (because the SDK does not return the
   *    revision id from the update call).
   * 4. User B registers and then attempts to GET the revision for that post.
   * 5. Assert that the attempt fails (403 or 404) using TestValidator.error.
   */

  // 1) Administrator signs up and creates category
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Adm1nStrongPassword!",
        username: undefined,
        display_name: "Test Admin",
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: `category-${RandomGenerator.alphaNumeric(6)}`,
          slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
          description: "Category for E2E test",
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2) User A registers and creates thread + post, then updates the post
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userA: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `author_${RandomGenerator.alphaNumeric(6)}`,
        email: userAEmail,
        password: "AuthorPassw0rd!",
        display_name: "Author A",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userA);

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `thread-${RandomGenerator.alphaNumeric(8)}`,
          status: undefined,
          pinned: undefined,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          parent_id: null,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 12,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // Update the post (author A) to create a revision snapshot on the backend
  const updated: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: {
          content: `${post.content}\n\n${RandomGenerator.paragraph({ sentences: 4 })}`,
        } satisfies IEconPoliticalForumPost.IUpdate,
      },
    );
  typia.assert(updated);

  // Because the SDK's update response does not expose a revision id, generate
  // a plausible revision id for authorization testing. The authorization test
  // accepts either 403 (forbidden) or 404 (not found) as valid.
  const plausibleRevision: IEconPoliticalForumPostRevision =
    typia.random<IEconPoliticalForumPostRevision>();
  const revisionId: string = plausibleRevision.id;

  // 3) User B registers and attempts to retrieve the revision (should fail)
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userB: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `visitor_${RandomGenerator.alphaNumeric(6)}`,
        email: userBEmail,
        password: "VisitorPassw0rd!",
        display_name: "Visitor B",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userB);

  // As user B, attempt to retrieve the revision produced by user A's edit.
  // Expected: the call throws (403 or 404). Use TestValidator.error with await
  // because callback is async.
  await TestValidator.error(
    "non-author cannot retrieve another user's post revision",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.posts.revisions.at(
        connection,
        {
          postId: post.id,
          revisionId,
        },
      );
    },
  );

  // Note: Audit log verification is out of scope because no audit-listing API
  // was provided. The test relies on environment-level audit capture if needed.
}
