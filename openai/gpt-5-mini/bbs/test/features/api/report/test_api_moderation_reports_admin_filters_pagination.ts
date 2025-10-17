import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumReport";

/*
 * Finalized E2E test implementation for administrator reports listing with filters and pagination.
 *
 * Notes on applied fixes from review:
 * - Replaced the non-declared `reason_code` filter injection with a supported `priority` filter
 *   (IEconPoliticalForumReport.IFilters contains `priority`) to avoid inventing an unsupported field.
 * - Kept repeated administrator.join calls to ensure admin token is present before admin-only actions.
 *
 * This final implementation matches DTOs defined in the provided materials and avoids introducing
 * properties not present in the supported filter DTO.
 */
export async function test_api_moderation_reports_admin_filters_pagination(
  connection: api.IConnection,
) {
  // 1) Administrator signs up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassw0rd!",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Administrator creates a category for the thread
  const categoryBody = {
    code: null,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: "Category for e2e moderation reports tests",
    is_moderated: false,
    requires_verification: false,
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3) Registered user signs up and will author thread/posts
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredUserBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: userEmail,
    password: "UserPassw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: registeredUserBody,
    });
  typia.assert(registered);

  // 4) As the registered user, create a thread
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 8 }),
    slug: `${RandomGenerator.alphaNumeric(6).toLowerCase()}-${Date.now()}`,
    status: "open",
    pinned: false,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  // Create two posts within the thread
  const postBodies = [
    {
      thread_id: thread.id,
      content: RandomGenerator.content({ paragraphs: 1 }),
    },
    {
      thread_id: thread.id,
      content: RandomGenerator.content({ paragraphs: 1 }),
    },
  ] satisfies IEconPoliticalForumPost.ICreate[];

  const posts: IEconPoliticalForumPost[] = [];
  for (const body of postBodies) {
    const post: IEconPoliticalForumPost =
      await api.functional.econPoliticalForum.registeredUser.posts.create(
        connection,
        { body },
      );
    typia.assert(post);
    posts.push(post);
  }

  // 5) Re-authenticate as administrator to create moderation case
  const admin2Email: string = typia.random<string & tags.Format<"email">>();
  const admin2: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: admin2Email,
        password: "AdminPassw0rd!",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin2);

  const moderationCaseBody = {
    case_number: `CASE-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    title: "E2E test moderation case",
    assigned_moderator_id: null,
    owner_admin_id: admin2.id,
    lead_report_id: null,
    status: "open",
    priority: "normal",
    summary: "Case created by automated e2e test",
    escalation_reason: null,
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const moderationCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      connection,
      { body: moderationCaseBody },
    );
  typia.assert(moderationCase);

  // 6) Create multiple reports against the posts with varying reason_code/priority
  const reportPayloads = [
    {
      reported_post_id: posts[0].id,
      reason_code: "harassment",
      reporter_text: "This post contains targeted harassment",
      reporter_anonymous: true,
      priority: "high",
      moderation_case_id: moderationCase.id,
    },
    {
      reported_post_id: posts[1].id,
      reason_code: "spam",
      reporter_text: "Appears to be spam content",
      reporter_anonymous: false,
      priority: "normal",
    },
    {
      reported_post_id: posts[0].id,
      reason_code: "harassment",
      reporter_text: "Additional harassment report",
      reporter_anonymous: false,
      priority: "high",
    },
    {
      reported_post_id: posts[1].id,
      reason_code: "other",
      reporter_text: "Other concerns",
      reporter_anonymous: true,
      priority: "low",
    },
  ];

  const createdReports: IEconPoliticalForumReport[] = [];
  for (const payload of reportPayloads) {
    const report: IEconPoliticalForumReport =
      await api.functional.econPoliticalForum.reports.create(connection, {
        body: payload satisfies IEconPoliticalForumReport.ICreate,
      });
    typia.assert(report);
    createdReports.push(report);
  }

  // 7) As administrator, call the reports.index with filters and pagination
  const admin3Email: string = typia.random<string & tags.Format<"email">>();
  const admin3: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: admin3Email,
        password: "AdminPassw0rd!",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin3);

  // 7.a Filter by moderation_case_id
  const pageLimit = 2;
  const moderationFilterRequest = {
    page: 1,
    limit: pageLimit,
    filters: {
      moderation_case_id: moderationCase.id,
    },
  } satisfies IEconPoliticalForumReport.IRequest;

  const moderationFiltered: IPageIEconPoliticalForumReport =
    await api.functional.econPoliticalForum.administrator.reports.index(
      connection,
      { body: moderationFilterRequest },
    );
  typia.assert(moderationFiltered);

  TestValidator.equals(
    "moderation filter - limit should match requested",
    moderationFiltered.pagination.limit,
    pageLimit,
  );

  TestValidator.predicate(
    "moderation filter - all returned reports have the moderation_case_id",
    moderationFiltered.data.every(
      (r) => r.moderation_case_id === moderationCase.id,
    ),
  );

  // 7.b Filter by priority (supported filter in IFilters)
  const priorityValue = "high";
  const priorityFilterRequest = {
    page: 1,
    limit: 10,
    filters: {
      priority: priorityValue,
    },
  } satisfies IEconPoliticalForumReport.IRequest;

  const priorityFiltered: IPageIEconPoliticalForumReport =
    await api.functional.econPoliticalForum.administrator.reports.index(
      connection,
      { body: priorityFilterRequest },
    );
  typia.assert(priorityFiltered);

  TestValidator.predicate(
    `priority filter - every report.priority equals ${priorityValue}`,
    priorityFiltered.data.every((r) => r.priority === priorityValue),
  );

  // 7.c Pagination boundary checks
  const paginationRequestPage1 = {
    page: 1,
    limit: 2,
    filters: {},
  } satisfies IEconPoliticalForumReport.IRequest;
  const paginationRequestPage2 = {
    page: 2,
    limit: 2,
    filters: {},
  } satisfies IEconPoliticalForumReport.IRequest;

  const page1: IPageIEconPoliticalForumReport =
    await api.functional.econPoliticalForum.administrator.reports.index(
      connection,
      { body: paginationRequestPage1 },
    );
  typia.assert(page1);

  const page2: IPageIEconPoliticalForumReport =
    await api.functional.econPoliticalForum.administrator.reports.index(
      connection,
      { body: paginationRequestPage2 },
    );
  typia.assert(page2);

  TestValidator.equals(
    "pagination limit matches request",
    page1.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination pages consistent",
    page1.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "records count is >= returned items",
    page1.pagination.records >= page1.data.length,
  );

  const idsPage1 = page1.data.map((d) => d.id);
  const idsPage2 = page2.data.map((d) => d.id);
  const intersection = idsPage1.filter((id) => idsPage2.includes(id));
  TestValidator.equals(
    "no duplicate reports across pages",
    intersection.length,
    0,
  );
}
