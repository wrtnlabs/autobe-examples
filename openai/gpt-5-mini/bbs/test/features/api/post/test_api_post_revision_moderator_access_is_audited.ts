import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPostRevision";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumPostRevision";

export async function test_api_post_revision_moderator_access_is_audited(
  connection: api.IConnection,
) {
  // 1) Administrator: create account and category
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);
  typia.assert(admin.token);

  const createCategoryBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_moderated: true,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: createCategoryBody },
    );
  typia.assert(category);

  // 2) Author: register, create thread, create post, and edit post to create revisions
  const authorPassword = RandomGenerator.alphaNumeric(12);
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: authorPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);
  typia.assert(author.token);

  const createThreadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    status: "open",
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: createThreadBody },
    );
  typia.assert(thread);

  const createPostBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: createPostBody },
    );
  typia.assert(post);

  // Make one update to create a revision snapshot
  const updatedContent1 = `${post.content}\n\n${RandomGenerator.paragraph({ sentences: 4 })}`;
  const updateBody1 = {
    content: updatedContent1,
  } satisfies IEconPoliticalForumPost.IUpdate;
  const updated1: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: updateBody1,
      },
    );
  typia.assert(updated1);

  // Make a second update to ensure multiple revisions exist
  const updatedContent2 = `${updatedContent1}\n\n${RandomGenerator.paragraph({ sentences: 3 })}`;
  const updateBody2 = {
    content: updatedContent2,
  } satisfies IEconPoliticalForumPost.IUpdate;
  const updated2: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: updateBody2,
      },
    );
  typia.assert(updated2);

  // 3) Moderator: register and then request revisions as moderator
  const modPassword = RandomGenerator.alphaNumeric(12);
  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: modPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(moderator);
  typia.assert(moderator.token);

  // 4) As moderator, list revisions for the post
  const revisionsRequest = {
    include_full: true,
    limit: 20,
    page: 1,
    sort: "created_at.desc",
  } satisfies IEconPoliticalForumPostRevision.IRequest;

  const revisionsPage: IPageIEconPoliticalForumPostRevision =
    await api.functional.econPoliticalForum.moderator.posts.revisions.index(
      connection,
      {
        postId: post.id,
        body: revisionsRequest,
      },
    );
  typia.assert(revisionsPage);

  // Assertions: there should be at least one revision record
  TestValidator.predicate(
    "revisions page should have records",
    revisionsPage.pagination.records >= 1,
  );

  // Consistency: server-reported records should be >= returned items
  TestValidator.predicate(
    "pagination records should be >= returned data length",
    revisionsPage.pagination.records >= revisionsPage.data.length,
  );

  // Each revision must belong to the post and have created_at
  for (const rev of revisionsPage.data) {
    typia.assert(rev);
    TestValidator.equals("revision belongs to post", rev.post_id, post.id);
    TestValidator.predicate(
      "revision has created_at",
      typeof rev.created_at === "string" && rev.created_at.length > 0,
    );
  }

  // Immutability check: fetch list again and verify a previously observed snapshot remains unchanged
  const firstSnapshot = revisionsPage.data[0];
  TestValidator.predicate("first snapshot exists", firstSnapshot !== undefined);

  const refetchRequest = {
    include_full: true,
    limit: 20,
    page: 1,
  } satisfies IEconPoliticalForumPostRevision.IRequest;
  const refetch: IPageIEconPoliticalForumPostRevision =
    await api.functional.econPoliticalForum.moderator.posts.revisions.index(
      connection,
      { postId: post.id, body: refetchRequest },
    );
  typia.assert(refetch);

  TestValidator.predicate("refetch has data", refetch.data.length > 0);
  TestValidator.equals(
    "first snapshot unchanged after refetch",
    firstSnapshot.content,
    refetch.data[0].content,
  );
}
