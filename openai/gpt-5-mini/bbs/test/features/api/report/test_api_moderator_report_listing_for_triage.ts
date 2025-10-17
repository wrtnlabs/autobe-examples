import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumReport";

export async function test_api_moderator_report_listing_for_triage(
  connection: api.IConnection,
) {
  /**
   * End-to-end test for moderator report listing and triage filtering.
   *
   * Steps:
   *
   * 1. Administrator joins (creates admin account) and creates a category.
   * 2. Registered user joins, creates a thread in the category and a post.
   * 3. Create two reports for the post: one public anonymous (unauthenticated) and
   *    one authenticated (registered user, not anonymous).
   * 4. Moderator joins, creates a moderation case, and assigns the authenticated
   *    report to the case (status -> 'triaged').
   * 5. Moderator lists reports using filters (status, reported_post_id,
   *    moderation_case_id) and verifies pagination, reporter_anonymous
   *    redaction, and filter correctness.
   */

  // 1) Administrator join and create a category
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPass!2025",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          is_moderated: true,
          requires_verification: false,
          order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2) Registered user join → create thread and post
  const userEmail = typia.random<string & tags.Format<"email">>();
  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "UserPass!2025",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(registered);

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(10),
          status: "open",
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  const post: IEconPoliticalForumPost =
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
  typia.assert(post);

  // 3) Submit reports: one public (anonymous) and one authenticated
  // Build an unauthenticated connection copy for public report
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const publicReport: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(unauthConn, {
      body: {
        reported_post_id: post.id,
        reason_code: "harassment",
        reporter_text: "Public anonymous report: offensive content",
        reporter_anonymous: true,
        priority: "normal",
      } satisfies IEconPoliticalForumReport.ICreate,
    });
  typia.assert(publicReport);

  const authReport: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        reason_code: "harassment",
        reporter_text: "Authenticated user reporting abusive content",
        reporter_anonymous: false,
        priority: "normal",
      } satisfies IEconPoliticalForumReport.ICreate,
    });
  typia.assert(authReport);

  // 4) Moderator join, create moderation case, assign the authenticated report
  const moderatorAccount: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: "ModPass!2025",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  const modCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.create(
      connection,
      {
        body: {
          case_number: `CASE-${typia.random<string & tags.Format<"uuid">>()}`,
          title: "Triage case for test reports",
          assigned_moderator_id: moderatorAccount.id,
          status: "open",
          priority: "normal",
          summary: "Case created by automated e2e test",
          legal_hold: false,
        } satisfies IEconPoliticalForumModerationCase.ICreate,
      },
    );
  typia.assert(modCase);

  const updatedReport: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.moderator.reports.update(
      connection,
      {
        reportId: authReport.id,
        body: {
          moderation_case_id: modCase.id,
          status: "triaged",
          triaged_at: new Date().toISOString(),
        } satisfies IEconPoliticalForumReport.IUpdate,
      },
    );
  typia.assert(updatedReport);

  // 5) Moderator lists reports with filters (status, reported_post_id, moderation_case_id)
  const pageResult: IPageIEconPoliticalForumReport =
    await api.functional.econPoliticalForum.moderator.reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          filters: {
            status: "triaged",
            reported_post_id: post.id,
            moderation_case_id: modCase.id,
          } satisfies IEconPoliticalForumReport.IFilters,
          sort: {
            sort_by: "created_at",
            order: "desc",
          } satisfies IEconPoliticalForumReport.ISort,
        } satisfies IEconPoliticalForumReport.IRequest,
      },
    );
  typia.assert(pageResult);

  // Validations
  TestValidator.predicate(
    "pagination contains current page",
    pageResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "returned page limit is not zero",
    pageResult.pagination.limit > 0,
  );

  // Ensure all returned reports match filters
  TestValidator.predicate(
    "all reports match requested post and case and triaged status",
    pageResult.data.every(
      (r) =>
        r.reported_post_id === post.id &&
        r.moderation_case_id === modCase.id &&
        r.status === "triaged",
    ),
  );

  // Verify presence and anonymity redaction
  const foundAuth = pageResult.data.find((r) => r.id === authReport.id);
  const foundAnon = pageResult.data.find((r) => r.id === publicReport.id);

  TestValidator.predicate(
    "authenticated report exists in listing",
    foundAuth !== undefined,
  );

  TestValidator.predicate(
    "authenticated report has reporter identity preserved",
    foundAuth !== undefined &&
      foundAuth.reporter_anonymous === false &&
      foundAuth.reporter_id !== null &&
      foundAuth.reporter_id !== undefined,
  );

  TestValidator.predicate(
    "public anonymous report exists in listing",
    foundAnon !== undefined,
  );

  TestValidator.predicate(
    "anonymous reporter identity is redacted in listing",
    foundAnon !== undefined &&
      foundAnon.reporter_anonymous === true &&
      (foundAnon.reporter_id === null || foundAnon.reporter_id === undefined),
  );
}
