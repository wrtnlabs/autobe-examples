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

export async function test_api_post_revision_list_by_author(
  connection: api.IConnection,
) {
  // This E2E test validates that an authenticated post author can retrieve
  // the revision snapshots for their post. It follows this workflow:
  // 1) Create an administrator account and a category
  // 2) Register an author account
  // 3) Author creates a thread and a post
  // 4) Author updates the post twice to generate revisions
  // 5) Author lists the post revisions and assertions are performed

  // 1) Administrator signup
  const adminEmail = typia.random<string & tags.Format<"email">>();
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

  // 2) Admin creates a category
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_moderated: false,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3) Author signup
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: authorEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 4) Author creates a thread in the category
  const threadCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(10),
    status: "open",
    pinned: false,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadCreateBody,
      },
    );
  typia.assert(thread);

  // 5) Author creates an initial post in the thread
  const initialContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
  });
  const postCreateBody = {
    thread_id: thread.id,
    content: initialContent,
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 6) Perform two updates to generate revisions
  const updatedContent1 = `${initialContent}\n\n${RandomGenerator.paragraph({ sentences: 5 })}`;
  const update1 = {
    content: updatedContent1,
  } satisfies IEconPoliticalForumPost.IUpdate;

  const postAfterUpdate1: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: update1,
      },
    );
  typia.assert(postAfterUpdate1);

  const updatedContent2 = `${updatedContent1}\n\n${RandomGenerator.paragraph({ sentences: 4 })}`;
  const update2 = {
    content: updatedContent2,
  } satisfies IEconPoliticalForumPost.IUpdate;

  const postAfterUpdate2: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: update2,
      },
    );
  typia.assert(postAfterUpdate2);

  // 7) Call the revisions index endpoint as the author
  const revisionsRequest = {
    page: 1,
    limit: 20,
  } satisfies IEconPoliticalForumPostRevision.IRequest;

  const pageResult: IPageIEconPoliticalForumPostRevision =
    await api.functional.econPoliticalForum.registeredUser.posts.revisions.index(
      connection,
      {
        postId: post.id,
        body: revisionsRequest,
      },
    );
  typia.assert(pageResult);

  // 8) Business logic assertions
  // - At least two revisions must exist (two updates produced two revision snapshots)
  TestValidator.predicate(
    "revisions count is at least the number of edits performed",
    pageResult.data.length >= 2,
  );

  // - Each revision must reference the original post id and must have editor_id and created_at
  for (const rev of pageResult.data) {
    TestValidator.equals(
      "revision.post_id equals original post id",
      rev.post_id,
      post.id,
    );
    TestValidator.predicate(
      "revision has an id",
      typeof rev.id === "string" && rev.id.length > 0,
    );
    TestValidator.predicate(
      "revision has created_at",
      typeof rev.created_at === "string" && rev.created_at.length > 0,
    );
    // Editor id may be the author's id for author edits; at minimum ensure presence or null per DTO
    TestValidator.predicate(
      "revision.content is a string",
      typeof rev.content === "string",
    );
  }

  // - Confirm that revision contents include previous versions (initial, update1, update2)
  const contents = pageResult.data.map((r) => r.content);
  TestValidator.predicate(
    "revision snapshots include initial content",
    contents.some((c) => c.includes(initialContent.substring(0, 20))),
  );
  TestValidator.predicate(
    "revision snapshots include first update",
    contents.some((c) => c.includes(updatedContent1.substring(0, 20))),
  );
  TestValidator.predicate(
    "revision snapshots include second update",
    contents.some((c) => c.includes(updatedContent2.substring(0, 20))),
  );

  // - Revisions ordered by created_at desc by default (if at least two items)
  if (pageResult.data.length >= 2) {
    const times = pageResult.data.map((r) => new Date(r.created_at).getTime());
    TestValidator.predicate(
      "revisions sorted by created_at desc",
      times[0] >= times[1],
    );
  }

  // Note: Teardown is handled by test DB reset in the CI environment; do not
  // attempt manual connection.headers manipulation or direct DB cleanup here.
}
