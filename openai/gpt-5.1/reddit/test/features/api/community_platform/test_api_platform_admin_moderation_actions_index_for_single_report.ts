import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Validate platform-admin listing of moderation actions scoped to a single
 * report.
 *
 * Business flow covered by this test:
 *
 * 1. A platform administrator account is created and implicitly authenticated.
 * 2. A member user account is created and implicitly authenticated.
 * 3. As the member user, a community report is created and its reportId captured.
 * 4. A second report is also created to verify scoping (actions for other reports
 *    must not leak).
 * 5. The test switches back to a platform-admin context via explicit login.
 * 6. Multiple moderation actions are created for the first report using the
 *    platformAdmin-scoped create endpoint.
 * 7. Additional moderation actions are created for the second report to ensure
 *    that index calls scoped to the first report do not include them.
 * 8. The platformAdmin index endpoint is called with various pagination and filter
 *    options to retrieve actions for the first report.
 * 9. The test validates pagination metadata, page size behavior, and filter
 *    behavior on actionTypes and actorType.
 * 10. The test also verifies that moderation actions belonging to the second report
 *     are not present in the listing for the first report by comparing action
 *     IDs.
 */
export async function test_api_platform_admin_moderation_actions_index_for_single_report(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and keep credentials for later login
  const platformAdminUsername = RandomGenerator.alphabets(12);
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminPassword = "AdminPassw0rd!";

  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: platformAdminUsername,
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // 2. Register a member user and keep identifier for later report creation
  const memberUsername = RandomGenerator.alphabets(10);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassw0rd!";

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // 3. As member user, create a report
  const reportReasonId = typia.random<string & tags.Format<"uuid">>();

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: reportReasonId,
          community_id: null,
          severity: null,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);

  // 4. Switch back to platform admin context explicitly using login
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminUsername,
        password: platformAdminPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLogin);

  // 5. Create a second report and some moderation actions for it to ensure scoping
  const otherReportReasonId = typia.random<string & tags.Format<"uuid">>();

  const otherReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: otherReportReasonId,
          community_id: null,
          severity: "high",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(otherReport);

  // 6. Create multiple moderation actions for the first report
  const actionTypes = ["warn_user", "remove_content", "ban_user"] as const;
  const targetScopes = ["user", "post", "user"] as const;

  const primaryTargetIds = ArrayUtil.repeat(
    actionTypes.length,
    (index) => `report-${report.id}-target-${index}`,
  );
  void primaryTargetIds; // targetIds reserved for potential future use

  const moderationActions: ICommunityPlatformModerationAction[] =
    await ArrayUtil.asyncMap(actionTypes, async (actionType, index) => {
      const created: ICommunityPlatformModerationAction =
        await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
          connection,
          {
            reportId: report.id,
            body: {
              community_id: null,
              action_type: actionType,
              target_scope: targetScopes[index],
              reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
              notes_internal: RandomGenerator.content({ paragraphs: 1 }),
            } satisfies ICommunityPlatformModerationAction.ICreate,
          },
        );
      return typia.assert(created);
    });

  // 7. Create moderation actions for the second report using distinct IDs
  const otherTargetIds = ArrayUtil.repeat(
    2,
    (index) => `other-report-${otherReport.id}-target-${index}`,
  );

  const otherReportActions: ICommunityPlatformModerationAction[] =
    await ArrayUtil.asyncMap(otherTargetIds, async (_targetId, index) => {
      const created: ICommunityPlatformModerationAction =
        await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
          connection,
          {
            reportId: otherReport.id,
            body: {
              community_id: null,
              action_type: "warn_user",
              target_scope: index % 2 === 0 ? "user" : "comment",
              reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
              notes_internal: RandomGenerator.content({ paragraphs: 1 }),
            } satisfies ICommunityPlatformModerationAction.ICreate,
          },
        );
      return typia.assert(created);
    });

  TestValidator.predicate(
    "created expected number of moderation actions for primary report",
    moderationActions.length === actionTypes.length,
  );
  TestValidator.predicate(
    "created some moderation actions for other report",
    otherReportActions.length === otherTargetIds.length,
  );

  // 8. Call index for the first report with pagination and no filters
  const indexAll: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.index(
      connection,
      {
        reportId: report.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          actionTypes: undefined,
          targetScopes: undefined,
          communityId: undefined,
          reportId: undefined,
          actorType: undefined,
          actorId: undefined,
          fromCreatedAt: undefined,
          toCreatedAt: undefined,
          search: undefined,
          sortField: undefined,
          sortDirection: undefined,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(indexAll);

  TestValidator.predicate(
    "indexAll.data length should not exceed pagination.limit",
    indexAll.data.length <= indexAll.pagination.limit,
  );

  // 9. Test pagination with limit=1
  const indexPageSize1: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.index(
      connection,
      {
        reportId: report.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          actionTypes: undefined,
          targetScopes: undefined,
          communityId: undefined,
          reportId: undefined,
          actorType: undefined,
          actorId: undefined,
          fromCreatedAt: undefined,
          toCreatedAt: undefined,
          search: undefined,
          sortField: undefined,
          sortDirection: undefined,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(indexPageSize1);

  TestValidator.equals(
    "pagination.limit equals requested limit 1",
    indexPageSize1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data length for limit=1 is at most 1",
    indexPageSize1.data.length <= 1,
  );

  // 10. Test filter behavior for a single actionType
  const filterActionType = actionTypes[0];
  const indexFiltered: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.index(
      connection,
      {
        reportId: report.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          actionTypes: [filterActionType],
          targetScopes: undefined,
          communityId: undefined,
          reportId: undefined,
          actorType: "platformadmin",
          actorId: undefined,
          fromCreatedAt: undefined,
          toCreatedAt: undefined,
          search: undefined,
          sortField: undefined,
          sortDirection: undefined,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(indexFiltered);

  await ArrayUtil.asyncForEach(indexFiltered.data, async (summary) => {
    TestValidator.equals(
      "filtered results must have matching actionType",
      summary.actionType,
      filterActionType,
    );
  });

  // 11. Ensure that moderation actions from otherReport are not mixed when listing for first report
  const allIdsForReport = indexAll.data.map((s) => s.id);
  await ArrayUtil.asyncForEach(otherReportActions, async (otherAction) => {
    TestValidator.predicate(
      "actions created for other report should not show up in primary report index",
      allIdsForReport.includes(otherAction.id) === false,
    );
  });
}
