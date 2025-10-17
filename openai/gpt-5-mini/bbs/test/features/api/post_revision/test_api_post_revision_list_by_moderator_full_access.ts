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

export async function test_api_post_revision_list_by_moderator_full_access(
  connection: api.IConnection,
) {
  // 1) Admin setup: create administrator account and a category
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin#2025pass",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin = await api.functional.auth.administrator.join(adminConn, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  const categoryCreateBody = {
    name: `category-${RandomGenerator.alphaNumeric(6)}`,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    description: null,
    code: null,
    is_moderated: true,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 2) Author setup: register author, create thread and initial post
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorJoinBody = {
    username: RandomGenerator.name(1),
    email: authorEmail,
    password: "Author#2025pass",
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const author = await api.functional.auth.registeredUser.join(authorConn, {
    body: authorJoinBody,
  });
  typia.assert(author);

  const threadCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: `t-${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      authorConn,
      { body: threadCreateBody },
    );
  typia.assert(thread);

  const postCreateBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      authorConn,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 3) Perform multiple edits to generate revision history
  const editBodies = [
    {
      content: `${post.content}\n\nEdit 1: ${RandomGenerator.paragraph({ sentences: 4 })}`,
    },
    {
      content: `${post.content}\n\nEdit 2: ${RandomGenerator.paragraph({ sentences: 5 })}`,
    },
  ] satisfies IEconPoliticalForumPost.IUpdate[];

  for (const body of editBodies) {
    const updated =
      await api.functional.econPoliticalForum.registeredUser.posts.update(
        authorConn,
        {
          postId: post.id,
          body,
        },
      );
    typia.assert(updated);
  }

  // 4) Moderator signup
  const modConn: api.IConnection = { ...connection, headers: {} };
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modJoinBody = {
    username: RandomGenerator.name(1),
    email: modEmail,
    password: "Mod#2025pass",
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(modConn, {
    body: modJoinBody,
  });
  typia.assert(moderator);

  // NOTE: If moderator activation by an administrator is required, that
  // activation step is not implementable with the provided SDK functions.
  // The test assumes moderator.join yields an active moderator token.

  // 5) Moderator requests revision list (include_full = true, page=1, limit=50)
  const revisionsRequest = {
    page: 1,
    limit: 50,
    include_full: true,
  } satisfies IEconPoliticalForumPostRevision.IRequest;

  const revisions: IPageIEconPoliticalForumPostRevision =
    await api.functional.econPoliticalForum.moderator.posts.revisions.index(
      modConn,
      {
        postId: post.id,
        body: revisionsRequest,
      },
    );
  typia.assert(revisions);

  // 6) Assertions: pagination and revision contents
  TestValidator.equals(
    "pagination current is 1",
    revisions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is <= 50",
    revisions.pagination.limit <= 50,
  );
  TestValidator.predicate(
    "there is at least one revision",
    revisions.data.length >= 1,
  );
  TestValidator.predicate(
    "every revision has content string",
    revisions.data.every(
      (r) => typeof r.content === "string" && r.content.length > 0,
    ),
  );
  TestValidator.predicate(
    "every revision has created_at",
    revisions.data.every(
      (r) => typeof r.created_at === "string" && r.created_at.length > 0,
    ),
  );
  TestValidator.predicate(
    "editor_id property exists on revisions",
    revisions.data.every((r) =>
      Object.prototype.hasOwnProperty.call(r, "editor_id"),
    ),
  );

  // Note: Audit-log verification is not implemented because the provided SDK
  // does not include an endpoint to retrieve audit/moderation logs. To add
  // audit-log assertions, expose an administrative audit-log index endpoint
  // (for example: GET /admin/audit/logs) or provide DB-level read access in
  // the test harness.
}
