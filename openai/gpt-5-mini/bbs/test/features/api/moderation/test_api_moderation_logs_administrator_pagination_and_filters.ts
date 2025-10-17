import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationLog";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumModerationLog";

/**
 * Validate administrator moderation logs pagination, sorting, and filtering.
 *
 * Business context:
 *
 * - Administrators must be able to list moderation log entries with pagination,
 *   sorted orders, and filters (moderator_id, moderation_case_id, created_at
 *   range, etc.).
 * - This test constructs real moderation events by creating content and having a
 *   moderator perform moderation actions that produce log entries.
 *
 * Steps:
 *
 * 1. Create administrator account (separate connection) and authenticate.
 * 2. Create a category as administrator.
 * 3. Create an optional moderation case as administrator.
 * 4. Create a registered user and use that account to create a thread and several
 *    posts.
 * 5. Create a moderator account (separate connection) and use it to perform
 *    moderator deletions on multiple posts to generate moderation log entries.
 * 6. As administrator, call moderationLogs.index with page=1, limit=2 and verify
 *    pagination metadata and two items returned.
 * 7. Call moderationLogs.index with sortBy=created_at, sortOrder=asc and verify
 *    chronological ordering across returned page(s).
 * 8. Call moderationLogs.index with moderator_id filter and verify all returned
 *    items are authored by that moderator.
 *
 * Validation points:
 *
 * - Pagination metadata (current, limit) must match requested page/limit.
 * - Data length corresponds to requested page size when enough entries exist.
 * - Sorting order respects created_at asc/desc.
 * - Filtering returns only matching records (e.g., moderator_id).
 */
export async function test_api_moderation_logs_administrator_pagination_and_filters(
  connection: api.IConnection,
) {
  // Create isolated connections for each role so SDK can manage Authorization
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const modConn: api.IConnection = { ...connection, headers: {} };
  const userConn: api.IConnection = { ...connection, headers: {} };

  // 1) Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: adminEmail,
        password: "AdminPassw0rd!",
        username: RandomGenerator.name(1),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create a category as administrator
  const categoryBody = {
    code: null,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.paragraph({ sentences: 2 })
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase(),
    description: null,
    is_moderated: true,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3) Optionally create a moderation case to associate with potential logs
  const caseBody = {
    case_number: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    title: `Moderation case for test ${RandomGenerator.alphaNumeric(4)}`,
    assigned_moderator_id: null,
    owner_admin_id: null,
    lead_report_id: null,
    status: "open",
    priority: "normal",
    summary: "Test moderation case for pagination/filter testing",
    escalation_reason: null,
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const modCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      adminConn,
      { body: caseBody },
    );
  typia.assert(modCase);

  // 4) Create a registered user, a thread, and multiple posts
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userConn, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: userEmail,
        password: "UserPassw0rd!",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userAuth);

  const threadCreate = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    slug: RandomGenerator.paragraph({ sentences: 2 })
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase(),
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userConn,
      { body: threadCreate },
    );
  typia.assert(thread);

  // Create multiple posts to be moderated
  const postIds: string[] = [];
  for (let i = 0; i < 3; ++i) {
    const postBody = {
      thread_id: thread.id,
      content: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies IEconPoliticalForumPost.ICreate;

    const post: IEconPoliticalForumPost =
      await api.functional.econPoliticalForum.registeredUser.posts.create(
        userConn,
        { body: postBody },
      );
    typia.assert(post);
    postIds.push(post.id);
  }

  // 5) Create a moderator and perform moderation actions (erase posts)
  const modEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(modConn, {
      body: {
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
        email: modEmail,
        password: "ModPassw0rd!",
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(moderator);

  // Perform moderator deletions to generate moderation logs (3 actions)
  for (const id of postIds) {
    await api.functional.econPoliticalForum.moderator.posts.erase(modConn, {
      postId: id,
    });
    // No typia.assert for void responses
  }

  // 6) As administrator, request moderation logs with pagination (page=1, limit=2)
  const pageRequest1 = {
    page: 1,
    limit: 2,
  } satisfies IEconPoliticalForumModerationLog.IRequest;

  const page1: IPageIEconPoliticalForumModerationLog.ISummary =
    await api.functional.econPoliticalForum.administrator.moderationLogs.index(
      adminConn,
      { body: pageRequest1 },
    );
  typia.assert(page1);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current equals requested page",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    page1.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records should be >= data length",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.equals(
    "returned data length equals requested limit",
    page1.data.length,
    2,
  );

  // 7) Verify sorting by created_at asc returns chronological order for page
  const sortRequest = {
    sortBy: "created_at",
    sortOrder: "asc",
    page: 1,
    limit: 10,
  } satisfies IEconPoliticalForumModerationLog.IRequest;

  const sortedPage: IPageIEconPoliticalForumModerationLog.ISummary =
    await api.functional.econPoliticalForum.administrator.moderationLogs.index(
      adminConn,
      { body: sortRequest },
    );
  typia.assert(sortedPage);

  // Confirm chronological order (ascending)
  const createdAts = sortedPage.data.map((d) => d.created_at);
  const isChronologicalAsc = createdAts.every(
    (v, i, arr) => i === 0 || arr[i - 1] <= v,
  );
  TestValidator.predicate(
    "moderation logs are in ascending chronological order",
    isChronologicalAsc,
  );

  // 8) Apply filter by moderator_id and verify returned logs belong to that moderator
  const filterByModerator = {
    moderator_id: moderator.id,
    limit: 50,
    page: 1,
  } satisfies IEconPoliticalForumModerationLog.IRequest;

  const filteredByModerator: IPageIEconPoliticalForumModerationLog.ISummary =
    await api.functional.econPoliticalForum.administrator.moderationLogs.index(
      adminConn,
      { body: filterByModerator },
    );
  typia.assert(filteredByModerator);

  TestValidator.predicate(
    "all returned logs authored by the moderator",
    filteredByModerator.data.every((d) => d.moderator_id === moderator.id),
  );

  // 9) Apply filter by moderation_case_id if present and verify (best-effort)
  if (modCase && modCase.id) {
    const filterByCase = {
      moderation_case_id: modCase.id,
      limit: 50,
      page: 1,
    } satisfies IEconPoliticalForumModerationLog.IRequest;

    const filteredByCase: IPageIEconPoliticalForumModerationLog.ISummary =
      await api.functional.econPoliticalForum.administrator.moderationLogs.index(
        adminConn,
        { body: filterByCase },
      );
    typia.assert(filteredByCase);

    // If there are items, ensure they reference the case; if none, that's acceptable
    if (filteredByCase.data.length > 0) {
      TestValidator.predicate(
        "filtered logs reference the moderation case",
        filteredByCase.data.every((d) => d.moderation_case_id === modCase.id),
      );
    }
  }

  // Note: Teardown (DB reset) should be handled by test harness/CI. This test
  // creates ephemeral records and relies on test DB reset between suites.
}
