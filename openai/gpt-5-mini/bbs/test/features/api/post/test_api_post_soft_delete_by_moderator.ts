import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_post_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Verify moderator soft-delete behavior using available SDK functions.
   * - Because GET/read endpoints or moderation log queries are not present in the
   *   provided SDK, the test validates success, idempotency, and access control
   *   by exercising the erase endpoint with role-scoped connections.
   *
   * Flow:
   *
   * 1. Create an administrator and using adminConn create a category.
   * 2. Create a registered author and using authorConn create a thread and a post.
   * 3. Create a moderator and using modConn call erase(postId).
   * 4. Verify erase succeeded (no exception) and that it is idempotent.
   * 5. Verify a non-moderator (author) cannot call the moderator erase endpoint.
   */

  // 1) Administrator context and create category
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass12345",
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: adminBody,
    });
  typia.assert(adminAuth);
  TestValidator.predicate("admin has id", !!adminAuth.id);

  const categoryBody = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.paragraph({ sentences: 2 })
      .replace(/\s+/g, "-")
      .toLowerCase(),
    description: null,
    is_moderated: false,
    requires_verification: false,
    order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      { body: categoryBody },
    );
  typia.assert(category);
  TestValidator.predicate("category has id", !!category.id);

  // 2) Author (registered user) context: create account, thread, and post
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const authorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AuthorPass12345",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const authorAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(authorConn, {
      body: authorBody,
    });
  typia.assert(authorAuth);
  TestValidator.predicate("author has id", !!authorAuth.id);

  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: RandomGenerator.alphaNumeric(10),
    status: undefined,
    pinned: undefined,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      authorConn,
      { body: threadBody },
    );
  typia.assert(thread);
  TestValidator.predicate("thread has id", !!thread.id);

  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.paragraph({ sentences: 20 }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      authorConn,
      {
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.predicate("post has id", !!post.id);

  // 3) Moderator context: create moderator and perform erase
  const modConn: api.IConnection = { ...connection, headers: {} };
  const modBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModPass12345",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const modAuth: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(modConn, { body: modBody });
  typia.assert(modAuth);
  TestValidator.predicate("moderator has id", !!modAuth.id);

  // Perform the moderator soft-delete (erase)
  await api.functional.econPoliticalForum.moderator.posts.erase(modConn, {
    postId: post.id,
  });
  TestValidator.predicate("moderator erase did not throw", true);

  // 4) Idempotency: calling erase again should not create duplicate failures
  await api.functional.econPoliticalForum.moderator.posts.erase(modConn, {
    postId: post.id,
  });
  TestValidator.predicate(
    "second moderator erase did not throw (idempotent)",
    true,
  );

  // 5) Access control: an ordinary author must NOT be able to call the moderator erase endpoint
  await TestValidator.error(
    "author cannot call moderator erase endpoint",
    async () => {
      await api.functional.econPoliticalForum.moderator.posts.erase(
        authorConn,
        {
          postId: post.id,
        },
      );
    },
  );
}
