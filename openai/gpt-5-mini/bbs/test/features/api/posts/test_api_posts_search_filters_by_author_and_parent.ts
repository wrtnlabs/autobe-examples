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

export async function test_api_posts_search_filters_by_author_and_parent(
  connection: api.IConnection,
) {
  /**
   * End-to-end test for PATCH /econPoliticalForum/posts
   *
   * Steps:
   *
   * 1. Create an administrator and a category
   * 2. Register userA, create a thread and a root post, then create many posts (to
   *    exceed default page size)
   * 3. Register userB and create a reply referencing the root post
   * 4. As a public caller, search by authorId and parentId, and validate
   *    pagination
   * 5. Verify that an oversized search query (>500 chars) is rejected with error
   */

  // 1. Administrator: create admin account and category
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: `cat-${RandomGenerator.alphaNumeric(4)}`,
          name: RandomGenerator.name(2),
          slug: `c-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 8,
          }),
          is_moderated: false,
          requires_verification: false,
          order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Register userA and create thread + many posts
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userA: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `userA_${RandomGenerator.alphaNumeric(6)}`,
        email: userAEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userA);

  // Create a thread as userA
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 4,
            wordMax: 9,
          }),
          slug: `t-${RandomGenerator.alphaNumeric(8)}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // Create a root post in the thread
  const rootPost: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(rootPost);

  // Create additional posts by userA to exceed default page size (20).
  // Create 23 additional posts so total posts in thread >= 24 (including root)
  const additionalCount = 23;
  await ArrayUtil.asyncForEach(
    ArrayUtil.repeat(additionalCount, (i) => i),
    async () => {
      const p =
        await api.functional.econPoliticalForum.registeredUser.posts.create(
          connection,
          {
            body: {
              thread_id: thread.id,
              content: RandomGenerator.content({
                paragraphs: 1,
                sentenceMin: 4,
                sentenceMax: 10,
              }),
            } satisfies IEconPoliticalForumPost.ICreate,
          },
        );
      typia.assert(p);
    },
  );

  // 3. Register userB and create a reply to rootPost
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userB: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `userB_${RandomGenerator.alphaNumeric(6)}`,
        email: userBEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userB);

  const reply: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          parent_id: rootPost.id,
          content: RandomGenerator.paragraph({
            sentences: 12,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(reply);

  // Use a public (unauthenticated) connection to validate public search behavior
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 4. Search by authorId (userA) - expect only userA posts
  const byAuthorReq = {
    authorId: userA.id,
  } satisfies IEconPoliticalForumPost.IRequest;

  const authorPage: IPageIEconPoliticalForumPost.ISummary =
    await api.functional.econPoliticalForum.posts.index(publicConn, {
      body: byAuthorReq,
    });
  typia.assert(authorPage);

  TestValidator.predicate(
    "all returned posts are authored by userA",
    authorPage.data.every((p) => p.author_id === userA.id),
  );

  // 5. Search by parentId (rootPost) - expect reply from userB present
  const byParentReq = {
    parentId: rootPost.id,
  } satisfies IEconPoliticalForumPost.IRequest;

  const parentPage: IPageIEconPoliticalForumPost.ISummary =
    await api.functional.econPoliticalForum.posts.index(publicConn, {
      body: byParentReq,
    });
  typia.assert(parentPage);

  TestValidator.predicate(
    "reply from userB is present in parent search results",
    parentPage.data.some((p) => p.id === reply.id),
  );

  // 6. Validate pagination: request page 2 when more than default page size exists
  const page2Req = {
    threadId: thread.id,
    page: 2,
    limit: 20,
  } satisfies IEconPoliticalForumPost.IRequest;

  const page2: IPageIEconPoliticalForumPost.ISummary =
    await api.functional.econPoliticalForum.posts.index(publicConn, {
      body: page2Req,
    });
  typia.assert(page2);

  TestValidator.equals(
    "pagination current page equals requested page",
    page2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 returns at least one record",
    page2.data.length > 0,
  );

  // 7. Negative test: long search query (> 500 chars) should be rejected
  const longSearch = {
    search: "a".repeat(501),
  } satisfies IEconPoliticalForumPost.IRequest;
  await TestValidator.error(
    "long search query (>500 chars) is rejected",
    async () => {
      await api.functional.econPoliticalForum.posts.index(publicConn, {
        body: longSearch,
      });
    },
  );
}
