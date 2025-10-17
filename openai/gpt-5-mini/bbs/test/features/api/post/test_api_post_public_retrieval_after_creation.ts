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

export async function test_api_post_public_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Administrator registers and SDK stores admin token into connection.headers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumAdministrator.IJoin,
  });
  typia.assert(admin);

  // 2. Administrator creates a category to host threads
  const categoryBody = {
    code: null,
    name: `test-category-${RandomGenerator.alphaNumeric(6)}`,
    slug: `test-category-${RandomGenerator.alphaNumeric(6)}`,
    description: "Category for E2E test: public post retrieval",
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Create a registered user who will author the thread and post
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: `user_${RandomGenerator.alphaNumeric(6)}`,
      email: userEmail,
      password: "UserPass123!",
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumRegisteredUser.IJoin,
  });
  typia.assert(user);

  // 4. With the registered user's context, create a thread in the category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: `thread-${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);

  // 5. Create a post in that thread as the registered user
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: postBody,
      },
    );
  typia.assert(post);

  // 6. Public/unauthenticated retrieval: create a shallow copy of connection with empty headers
  //    (Do NOT mutate connection.headers directly; this pattern is allowed to simulate public client)
  const publicConn: api.IConnection = { ...connection, headers: {} };

  const read = await api.functional.econPoliticalForum.posts.at(publicConn, {
    postId: post.id,
  });
  typia.assert(read);

  // 7. Business assertions (actual-first, expected-second pattern)
  TestValidator.equals("post id matches", read.id, post.id);
  TestValidator.equals("thread id matches", read.thread_id, thread.id);
  TestValidator.equals("author id matches", read.author_id, user.id);
  TestValidator.equals("content matches", read.content, post.content);
  TestValidator.equals("is_edited is false", read.is_edited, false);

  // edited_at / deleted_at might be null or undefined depending on implementation; accept either
  TestValidator.predicate(
    "edited_at is nullish",
    read.edited_at === null || read.edited_at === undefined,
  );

  TestValidator.predicate(
    "deleted_at is nullish",
    read.deleted_at === null || read.deleted_at === undefined,
  );

  TestValidator.equals("is_hidden is false", read.is_hidden, false);

  // Ensure creation response and public read are consistent for key fields
  TestValidator.equals(
    "creation vs public: content",
    post.content,
    read.content,
  );
  TestValidator.equals(
    "creation vs public: author",
    post.author_id,
    read.author_id,
  );
  TestValidator.equals(
    "creation vs public: thread",
    post.thread_id,
    read.thread_id,
  );

  // Note: Audit log / DB-level checks are environment-specific and not invoked here. We validate persistence by comparing creation result and public read.
}
