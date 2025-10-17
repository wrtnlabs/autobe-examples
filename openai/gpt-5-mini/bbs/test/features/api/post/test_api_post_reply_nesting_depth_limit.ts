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

export async function test_api_post_reply_nesting_depth_limit(
  connection: api.IConnection,
) {
  /**
   * Validate reply nesting limits and parent integrity.
   *
   * Steps:
   *
   * 1. Administrator signs up and creates a category.
   * 2. Registered user signs up, creates a thread in that category.
   * 3. Create a top-level post and then replies up to MAX_DEPTH.
   * 4. Attempt a reply that exceeds MAX_DEPTH and assert error is thrown.
   * 5. Attempt a reply to a non-existent parent id and assert error is thrown.
   * 6. Validate parent_id chain and expected post counts.
   */

  const MAX_DEPTH = 3;

  // 1) Administrator signs up and creates a category
  const admin = await api.functional.auth.administrator.join(connection, {
    body: typia.random<IEconPoliticalForumAdministrator.IJoin>(),
  });
  typia.assert(admin);

  const categoryBody = {
    code: null,
    name: `nesting-test-${RandomGenerator.alphabets(6)}`,
    slug: `nest-${RandomGenerator.alphabets(6)}-${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}`,
    description: null,
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 2) Registered user joins
  const userAuth = await api.functional.auth.registeredUser.join(connection, {
    body: typia.random<IEconPoliticalForumRegisteredUser.IJoin>(),
  });
  typia.assert(userAuth);

  // 3) Registered user creates a thread in the category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    slug: `${RandomGenerator.alphabets(6).toLowerCase()}-${Date.now()}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadBody,
      },
    );
  typia.assert(thread);

  // 4) Create a top-level post (post A)
  const posts: IEconPoliticalForumPost[] = [];

  const postA =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(postA);
  posts.push(postA);

  // 5) Create replies up to MAX_DEPTH
  for (let depth = 1; depth <= MAX_DEPTH; ++depth) {
    const parent = posts[posts.length - 1];
    typia.assert(parent);

    const reply =
      await api.functional.econPoliticalForum.registeredUser.posts.create(
        connection,
        {
          body: {
            thread_id: thread.id,
            parent_id: parent.id,
            content: RandomGenerator.paragraph({ sentences: 6 }),
          } satisfies IEconPoliticalForumPost.ICreate,
        },
      );
    typia.assert(reply);
    posts.push(reply);
  }

  // 6) Attempt to exceed nesting limit: create one more reply beyond MAX_DEPTH
  await TestValidator.error(
    "exceeding nesting depth should be rejected",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.posts.create(
        connection,
        {
          body: {
            thread_id: thread.id,
            parent_id: posts[posts.length - 1].id,
            content: RandomGenerator.paragraph({ sentences: 4 }),
          } satisfies IEconPoliticalForumPost.ICreate,
        },
      );
    },
  );

  // 7) Attempt to reply to a non-existent parent id
  const fakeParentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reply to non-existent parent should fail",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.posts.create(
        connection,
        {
          body: {
            thread_id: thread.id,
            parent_id: fakeParentId,
            content: RandomGenerator.paragraph({ sentences: 4 }),
          } satisfies IEconPoliticalForumPost.ICreate,
        },
      );
    },
  );

  // 8) Business validations
  TestValidator.equals(
    "total created posts count matches expected",
    posts.length,
    1 + MAX_DEPTH,
  );

  // Validate parent chain: ensure parent_id exists and equals previous post id
  for (let i = 1; i < posts.length; ++i) {
    // parent_id is optional in DTO; assert non-null before comparing
    const parentId = typia.assert<string & tags.Format<"uuid">>(
      posts[i].parent_id!,
    );
    TestValidator.equals(
      `parent chain at depth ${i}`,
      parentId,
      posts[i - 1].id,
    );
  }

  // Teardown note: rely on test environment DB reset between tests. Do not
  // modify connection.headers or perform manual header management.
}
