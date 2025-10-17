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

export async function test_api_post_soft_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections for admin and author to avoid touching global headers
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const authorConn: api.IConnection = { ...connection, headers: {} };

  // 2) Administrator signs up (creates admin account and authentication token)
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPass!2025",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 3) Administrator creates a category
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          is_moderated: false,
          requires_verification: false,
          order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4) Registered user (author) signs up
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(authorConn, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: "AuthorPass!2025",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 5) Author creates a thread in the category
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      authorConn,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);
  TestValidator.equals(
    "thread belongs to created category",
    thread.category_id,
    category.id,
  );

  // 6) Author creates a post in the thread
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      authorConn,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to created thread",
    post.thread_id,
    thread.id,
  );

  // 7) Administrator soft-deletes the post
  await api.functional.econPoliticalForum.administrator.posts.erase(adminConn, {
    postId: post.id,
  });
  // If no exception thrown, operation succeeded (204 No Content). Mark success.
  TestValidator.predicate("administrator erased post without error", true);

  // 8) Repeating DELETE (idempotency) should not throw
  await api.functional.econPoliticalForum.administrator.posts.erase(adminConn, {
    postId: post.id,
  });
  TestValidator.predicate(
    "administrator erase is idempotent (second call)",
    true,
  );

  // 9) Ensure ordinary registered user cannot call admin erase (permission enforcement)
  await TestValidator.error(
    "non-admin cannot delete post using administrator endpoint",
    async () => {
      await api.functional.econPoliticalForum.administrator.posts.erase(
        authorConn,
        {
          postId: post.id,
        },
      );
    },
  );
}
