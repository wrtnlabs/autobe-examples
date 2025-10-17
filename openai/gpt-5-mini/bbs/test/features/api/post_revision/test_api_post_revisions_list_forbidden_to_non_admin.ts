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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumPostRevision";

export async function test_api_post_revisions_list_forbidden_to_non_admin(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure that the administrator-only revisions listing endpoint is not
   *   accessible to ordinary registered users.
   *
   * Flow:
   *
   * 1. Create an administrator and, while authenticated as admin, create a
   *    category for threads.
   * 2. Create a registered user (author) and create a thread and a post.
   * 3. Edit the post to create a revision snapshot.
   * 4. Create a separate registered (non-admin) user and attempt to call the admin
   *    revisions listing endpoint. Expect an error (forbidden/unauth).
   */

  // 1) Administrator sign-up and category creation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassw0rd!";
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const categoryCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 2) Author registration -> create thread -> create post
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const authorPassword = "AuthorPassw0rd!";
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: authorEmail,
        password: authorPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  const threadCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphabets(10),
    status: "open",
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadCreateBody },
    );
  typia.assert(thread);

  const postCreateBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 3) Edit the post to create a revision snapshot
  const updateBody = {
    content: `${post.content}\n\n${RandomGenerator.paragraph({ sentences: 4 })}`,
  } satisfies IEconPoliticalForumPost.IUpdate;

  const updatedPost: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPost);

  // 4) Create a separate non-admin user and attempt to call admin revisions.index
  const nonAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const nonAdminPassword = "UserPassw0rd!";
  const nonAdmin: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: nonAdminEmail,
        password: nonAdminPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(nonAdmin);

  // Attempt to list revisions as a non-admin. The admin endpoint should reject.
  await TestValidator.error(
    "non-admin should be forbidden from listing post revisions",
    async () => {
      await api.functional.econPoliticalForum.administrator.posts.revisions.index(
        connection,
        {
          postId: post.id,
          body: {
            include_full: true,
            page: 1,
            limit: 10,
          } satisfies IEconPoliticalForumPostRevision.IRequest,
        },
      );
    },
  );

  // Note: Audit-log verification and explicit resource teardown are not
  // possible with the provided SDK functions. Test harness should clean the
  // DB between runs.
}
