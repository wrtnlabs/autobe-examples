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

export async function test_api_post_revision_list_forbidden_for_non_author(
  connection: api.IConnection,
) {
  // 1) Administrator setup: create admin account and a category
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumAdministrator.IJoin,
  });
  typia.assert(admin);

  const category =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: `cat-${RandomGenerator.alphabets(6)}`,
          slug: RandomGenerator.alphabets(8),
          description: "Test category for revision privacy checks",
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2) Author signup: create registered user who will author the post
  const author = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: `author_${RandomGenerator.alphaNumeric(6)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: "AuthorPass123!",
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumRegisteredUser.IJoin,
  });
  typia.assert(author);

  // 3) As the author (SDK auto sets Authorization), create a thread
  const thread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: RandomGenerator.alphabets(8),
          status: "open",
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 4) Create a post in the thread as the author
  const post =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 12,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 5) Edit the post to create at least one revision snapshot
  const updated =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 18,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IEconPoliticalForumPost.IUpdate,
      },
    );
  typia.assert(updated);

  // 6) Other user signup (non-author): create second registered user
  const other = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: `other_${RandomGenerator.alphaNumeric(6)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: "OtherPass123!",
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumRegisteredUser.IJoin,
  });
  typia.assert(other);

  // 7) Attempt to list revisions for the author's post as the non-author
  // Expectation: 403 Forbidden or 404 Not Found to avoid exposing revisions
  await TestValidator.httpError(
    "non-author cannot list post revisions (forbidden or not-found)",
    [403, 404],
    async () => {
      await api.functional.econPoliticalForum.registeredUser.posts.revisions.index(
        connection,
        {
          postId: post.id,
          body: {
            page: 1,
            limit: 20,
            include_full: true,
          } satisfies IEconPoliticalForumPostRevision.IRequest,
        },
      );
    },
  );

  // If the call above did not throw, that is a test failure. Additional
  // business-level assertion: ensure that the non-author token is indeed set
  // (the SDK sets connection.headers.Authorization on join), and that the
  // author and other have different ids.
  TestValidator.predicate(
    "author and non-author are distinct accounts",
    author.id !== other.id,
  );
}
