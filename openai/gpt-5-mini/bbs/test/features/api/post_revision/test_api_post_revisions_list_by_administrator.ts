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

export async function test_api_post_revisions_list_by_administrator(
  connection: api.IConnection,
) {
  // 1) Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1).toLowerCase(),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create a category as administrator
  const categorySlug = RandomGenerator.paragraph({ sentences: 2 })
    .replace(/\s+/g, "-")
    .toLowerCase();
  const categoryName = RandomGenerator.paragraph({ sentences: 3 });
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: categoryName,
          slug: categorySlug,
          description: null,
          is_moderated: false,
          requires_verification: false,
          order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3) Registered author registration
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = RandomGenerator.alphaNumeric(12);
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

  // 4) Create a thread as the registered author
  const threadTitle = RandomGenerator.paragraph({ sentences: 6 });
  const threadSlug = RandomGenerator.paragraph({ sentences: 2 })
    .replace(/\s+/g, "-")
    .toLowerCase();
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: threadTitle,
          slug: threadSlug,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5) Create initial post as the author
  const initialContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: initialContent,
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 6) Perform two edits to generate revisions
  const firstEdit = `${initialContent}\n\nEdit 1: ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const updated1: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: {
          content: firstEdit,
        } satisfies IEconPoliticalForumPost.IUpdate,
      },
    );
  typia.assert(updated1);

  const secondEdit = `${firstEdit}\n\nEdit 2: ${RandomGenerator.paragraph({ sentences: 4 })}`;
  const updated2: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: {
          content: secondEdit,
        } satisfies IEconPoliticalForumPost.IUpdate,
      },
    );
  typia.assert(updated2);

  // 7) As administrator, request revision snapshots with pagination and include_full
  const revisionsPage: IPageIEconPoliticalForumPostRevision =
    await api.functional.econPoliticalForum.administrator.posts.revisions.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 20,
          include_full: true,
          sort: "created_at.desc",
        } satisfies IEconPoliticalForumPostRevision.IRequest,
      },
    );
  typia.assert(revisionsPage);

  // 8) Validations
  TestValidator.predicate(
    "pagination present",
    revisionsPage.pagination !== null && revisionsPage.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page",
    revisionsPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "at least two revisions exist",
    revisionsPage.data.length >= 2,
  );

  // Ensure that full content snapshots were returned and include the edits
  const allContents = revisionsPage.data.map((r) => r.content);
  TestValidator.predicate(
    "contains first edit content",
    allContents.some((c) => c === firstEdit),
  );
  TestValidator.predicate(
    "contains second edit content",
    allContents.some((c) => c === secondEdit),
  );

  // Operational note: audit log verification (access event recorded) is outside of this SDK scope.
  // Infrastructure or DB-level audit log checks must be performed separately by ops or via a dedicated audit API.
  TestValidator.predicate(
    "audit log verification must be done out-of-band",
    true,
  );

  // Teardown note: No delete endpoints available in provided SDK. Ensure test database reset or use isolated schema per test run.
}
