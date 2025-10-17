import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumModerationCase";

/*
 * Validate moderator search, filtering, sorting and pagination of moderation
 * cases. Ensures moderator-level redaction rules (reporter anonymity) are
 * respected and pagination metadata is correct.
 */
export async function test_api_moderation_cases_search_listing_by_moderator_success(
  connection: api.IConnection,
) {
  // 1) Moderator registration (SDK will set Authorization header)
  const moderatorAuth: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(moderatorAuth);
  typia.assert<IAuthorizationToken>(moderatorAuth.token);

  const moderatorId: string = moderatorAuth.id;

  // 2) Create reports (one anonymous to exercise PII redaction expectations)
  const anonReport: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(connection, {
      body: {
        reported_thread_id: typia.random<string & tags.Format<"uuid">>(),
        reason_code: "spam",
        reporter_text: RandomGenerator.paragraph({ sentences: 6 }),
        reporter_anonymous: true,
        status: "pending",
        priority: "normal",
      } satisfies IEconPoliticalForumReport.ICreate,
    });
  typia.assert(anonReport);

  const normalReport: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(connection, {
      body: {
        reported_thread_id: typia.random<string & tags.Format<"uuid">>(),
        reason_code: "harassment",
        reporter_text: RandomGenerator.paragraph({ sentences: 4 }),
        reporter_anonymous: false,
        status: "pending",
        priority: "low",
      } satisfies IEconPoliticalForumReport.ICreate,
    });
  typia.assert(normalReport);

  // 3) Create moderation cases with varying statuses/priorities
  const caseOpen1: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.create(
      connection,
      {
        body: {
          case_number: `CASE-${new Date().getUTCFullYear()}-0001`,
          title: "Test case open 1",
          status: "open",
          priority: "normal",
          summary: "Open case referencing anonymous report",
          lead_report_id: anonReport.id,
          legal_hold: false,
        } satisfies IEconPoliticalForumModerationCase.ICreate,
      },
    );
  typia.assert(caseOpen1);

  const caseOpen2: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.create(
      connection,
      {
        body: {
          case_number: `CASE-${new Date().getUTCFullYear()}-0002`,
          title: "Test case open 2",
          status: "open",
          priority: "high",
          summary: "Another open case",
          assigned_moderator_id: moderatorId,
          legal_hold: false,
        } satisfies IEconPoliticalForumModerationCase.ICreate,
      },
    );
  typia.assert(caseOpen2);

  const caseClosed: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.create(
      connection,
      {
        body: {
          case_number: `CASE-${new Date().getUTCFullYear()}-0003`,
          title: "Closed case",
          status: "closed",
          priority: "low",
          summary: "A closed case",
          legal_hold: false,
        } satisfies IEconPoliticalForumModerationCase.ICreate,
      },
    );
  typia.assert(caseClosed);

  // 4) As moderator, search/filter: status=open, page=1, limit=20, sort created_at desc
  const pageRequest = {
    page: 1,
    limit: 20,
    status: "open",
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IEconPoliticalForumModerationCase.IRequest;

  const pageResult: IPageIEconPoliticalForumModerationCase.ISummary =
    await api.functional.econPoliticalForum.moderator.moderationCases.index(
      connection,
      { body: pageRequest },
    );
  typia.assert(pageResult);

  // 5) Validations
  TestValidator.equals(
    "pagination current equals requested page",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    pageResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination pages and records are non-negative integers",
    pageResult.pagination.pages >= 0 && pageResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "all returned cases have status open",
    pageResult.data.every((d) => d.status === "open"),
  );

  TestValidator.predicate(
    "every summary contains required fields",
    pageResult.data.every(
      (d) =>
        typeof d.id === "string" &&
        typeof d.case_number === "string" &&
        typeof d.status === "string" &&
        typeof d.priority === "string" &&
        typeof d.created_at === "string",
    ),
  );

  TestValidator.predicate(
    "summaries do not leak reporter identity",
    pageResult.data.every(
      (d) => Object.prototype.hasOwnProperty.call(d, "reporter_id") === false,
    ),
  );

  TestValidator.predicate(
    "lead_report_id if present looks like uuid or null",
    pageResult.data.every(
      (d) => d.lead_report_id === null || typeof d.lead_report_id === "string",
    ),
  );

  // 6) Edge case: includeDeleted=true should be rejected for moderators (admins only)
  await TestValidator.error(
    "includeDeleted is restricted to admin and should be rejected for moderator",
    async () => {
      await api.functional.econPoliticalForum.moderator.moderationCases.index(
        connection,
        {
          body: {
            includeDeleted: true,
            page: 1,
            limit: 20,
          } satisfies IEconPoliticalForumModerationCase.IRequest,
        },
      );
    },
  );

  // Cleanup is expected to be handled by the test environment (DB reset between tests).
}
