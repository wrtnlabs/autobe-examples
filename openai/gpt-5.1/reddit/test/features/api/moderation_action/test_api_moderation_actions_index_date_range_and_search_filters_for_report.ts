import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

export async function test_api_moderation_actions_index_date_range_and_search_filters_for_report(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser (reporter)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!123",
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As the memberUser, create a report
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);

  // 3. Register and authenticate a communityModerator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!123",
    display_name: RandomGenerator.name(),
    href: "https://example.com/mod/join",
    referrer: "https://example.com/mod/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. Create two moderation actions for the report with distinct text
  const firstActionBody = {
    community_id: null,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: "Flagged for spam content in recent posts",
    notes_internal: "Initial spam warning for this account.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const secondActionBody = {
    community_id: null,
    action_type: "restrict_user",
    target_scope: "user",
    reason_summary: "Harassment reports against this user",
    notes_internal: "Applied temporary restriction due to harassment pattern.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const firstAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: firstActionBody,
      },
    );
  typia.assert(firstAction);

  // Ensure some time difference between actions (best-effort; may not be required by backend)
  await new Promise((resolve) => setTimeout(resolve, 50));

  const secondAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: secondActionBody,
      },
    );
  typia.assert(secondAction);

  const firstCreatedAt: string = firstAction.created_at;
  const secondCreatedAt: string = secondAction.created_at;

  const earliest =
    firstCreatedAt < secondCreatedAt ? firstCreatedAt : secondCreatedAt;
  const latest =
    firstCreatedAt < secondCreatedAt ? secondCreatedAt : firstCreatedAt;

  // Helper to slightly shrink or expand ISO date-time bounds by manipulating string is brittle,
  // so use exact timestamps as inclusive bounds where possible.

  // 5-1. Filter by date range that should include only the first action.
  // We use the same timestamp as both fromCreatedAt and toCreatedAt targeting firstAction.
  const narrowDateFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: firstCreatedAt,
    toCreatedAt: firstCreatedAt,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const narrowPage: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.index(
      connection,
      {
        reportId: report.id,
        body: narrowDateFilterBody,
      },
    );
  typia.assert(narrowPage);

  TestValidator.equals(
    "date-range filter (narrow) should return exactly one action",
    narrowPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "narrow date-range filter should return first action id",
    narrowPage.data[0]?.id,
    firstAction.id,
  );

  // 5-2. Filter by broader date range that includes both actions
  const broadDateFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: earliest,
    toCreatedAt: latest,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const broadPage: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.index(
      connection,
      {
        reportId: report.id,
        body: broadDateFilterBody,
      },
    );
  typia.assert(broadPage);

  TestValidator.equals(
    "broad date-range filter should report two records",
    broadPage.pagination.records,
    2,
  );
  const broadIds = broadPage.data.map((a) => a.id).sort();
  const expectedIds = [firstAction.id, secondAction.id].sort();
  TestValidator.equals(
    "broad date-range filter should contain both action ids",
    broadIds,
    expectedIds,
  );

  // 5-3. Filter by search text matching only the first action's reason_summary/notes_internal
  const searchFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: "spam",
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const searchPage: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.index(
      connection,
      {
        reportId: report.id,
        body: searchFilterBody,
      },
    );
  typia.assert(searchPage);

  TestValidator.equals(
    "search filter 'spam' should return exactly one record",
    searchPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "search filter 'spam' should return first action id",
    searchPage.data[0]?.id,
    firstAction.id,
  );
}
