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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumPost";

export async function test_api_post_thread_posts_public_listing(
  connection: api.IConnection,
) {
  // 1. Administrator signs up (will set connection.headers Authorization)
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumAdministrator.IJoin,
  });
  typia.assert(admin);

  // 2. Admin creates a category
  const category =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: `category-${RandomGenerator.alphaNumeric(6)}`,
          slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
          description: "Auto-created test category",
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  // FIX APPLIED: validate category response
  typia.assert(category);

  // 3. Registered user signs up (sets connection.headers to user token)
  const user = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: `user_${RandomGenerator.alphaNumeric(6)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: "UserPass1234",
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumRegisteredUser.IJoin,
  });
  typia.assert(user);

  // 4. User creates a thread in the created category
  const thread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `thread-${RandomGenerator.alphaNumeric(8)}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5. User creates a root post in the thread
  const rootPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(rootPost);

  // 6. User creates a reply post referencing the root post
  const replyPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          parent_id: rootPost.id,
          content: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(replyPost);

  // 7. As public (unauthenticated) client, request the thread posts list
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const page = await api.functional.econPoliticalForum.threads.posts.index(
    publicConn,
    {
      threadId: thread.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalForumPost.IRequest,
    },
  );
  typia.assert(page);

  // 8. Business assertions
  TestValidator.equals(
    "pagination current page is 1",
    page.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", page.pagination.limit, 20);
  TestValidator.predicate(
    "returned data contains root post",
    page.data.some((p) => p.id === rootPost.id),
  );
  TestValidator.predicate(
    "returned data contains reply post",
    page.data.some((p) => p.id === replyPost.id),
  );

  const foundReply = page.data.find((p) => p.id === replyPost.id);
  if (foundReply) {
    TestValidator.equals(
      "reply references its parent",
      foundReply.parent_id,
      rootPost.id,
    );
    // Ensure visibility: posts returned to public client should not be hidden or deleted
    TestValidator.predicate(
      "reply is visible (not hidden)",
      foundReply.is_hidden === false,
    );
    TestValidator.predicate(
      "reply is not soft-deleted",
      foundReply.deleted_at === null || foundReply.deleted_at === undefined,
    );
  } else {
    throw new Error("Reply post not found in public listing");
  }

  // pagination metadata sanity
  TestValidator.predicate(
    "pagination records >= 2",
    page.pagination.records >= 2,
  );
}
