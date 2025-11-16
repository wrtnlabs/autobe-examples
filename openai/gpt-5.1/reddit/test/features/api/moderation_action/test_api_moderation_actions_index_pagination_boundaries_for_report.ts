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

/**
 * Validate pagination boundary behavior when listing moderation actions for a
 * single report.
 *
 * Business workflow:
 *
 * 1. Register a member user (reporter) via auth.memberUser.join, which also
 *    authenticates the connection as that member.
 * 2. As the authenticated member, create a top-level report using
 *    communityPlatform.memberUser.reports.create and capture its report.id as
 *    the target reportId for moderation actions.
 * 3. Register a community moderator via auth.communityModerator.join, which
 *    switches the connection to an authenticated communityModerator context
 *    suitable for moderation operations.
 * 4. Using the moderator context, create multiple moderation actions (e.g., 15)
 *    for the report via
 *    communityPlatform.communityModerator.reports.moderationActions.create,
 *    varying action_type and target_scope to simulate realistic moderation
 *    history.
 * 5. Call the PATCH index endpoint
 *    communityPlatform.communityModerator.reports.moderationActions.index for
 *    that report with page=1 and limit lower than the total number of actions
 *    (e.g., limit=10) and verify:
 *
 *    - The response contains exactly `limit` items in `data`.
 *    - `pagination.records` equals the total number of created actions.
 *    - `pagination.pages` equals `ceil(records / limit)`.
 * 6. Request the last page (page = pagination.pages) and verify that the number of
 *    items is either `limit` (when records is divisible by limit) or the
 *    remaining records (for a partial last page).
 * 7. Request a page index greater than `pagination.pages` (page = pages + 1) and
 *    verify that the service behaves gracefully without throwing errors, by
 *    asserting that:
 *
 *    - `pagination.records` and `pagination.pages` remain consistent with the
 *         earlier response, and
 *    - Either `data` is empty, or `pagination.current` is clamped to a valid page
 *         (e.g., last page), or the server echoes back the requested
 *         out-of-range page index.
 */
export async function test_api_moderation_actions_index_pagination_boundaries_for_report(
  connection: api.IConnection,
) {
  // 1. Register a member user (reporter) and authenticate as that member
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a report as the authenticated member user
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  const reportId: string & tags.Format<"uuid"> = report.id;

  // 3. Register a community moderator and authenticate as that moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. Create multiple moderation actions for this report (e.g., 15)
  const totalActions = 15;
  const actionTypes = [
    "no_action",
    "remove_content",
    "lock_content",
    "warn_user",
    "restrict_user",
    "ban_user",
    "escalate",
  ] as const;
  const targetScopes = [
    "post",
    "comment",
    "community",
    "user",
    "platform_wide",
  ] as const;

  const createdActions: ICommunityPlatformModerationAction[] = [];
  for (let i = 0; i < totalActions; ++i) {
    const body = {
      community_id: null,
      action_type: RandomGenerator.pick(actionTypes),
      target_scope: RandomGenerator.pick(targetScopes),
      reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
      notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ICommunityPlatformModerationAction.ICreate;

    const action: ICommunityPlatformModerationAction =
      await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
        connection,
        {
          reportId,
          body,
        },
      );
    typia.assert(action);
    createdActions.push(action);
  }

  TestValidator.equals(
    "created moderation actions count should match totalActions",
    createdActions.length,
    totalActions,
  );

  // 5. First page with limit lower than total
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const firstPageRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const firstPage: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.index(
      connection,
      {
        reportId,
        body: firstPageRequestBody,
      },
    );
  typia.assert(firstPage);

  TestValidator.equals(
    "first page should contain exactly limit items",
    firstPage.data.length,
    limit,
  );

  const pagination = firstPage.pagination;
  const records = pagination.records;
  const pages = pagination.pages;

  TestValidator.equals(
    "pagination.records should equal totalActions",
    records,
    totalActions,
  );

  const expectedPages = Math.ceil(records / limit);
  TestValidator.equals(
    "pagination.pages should equal ceil(records/limit)",
    pages,
    expectedPages,
  );

  // 6. Last page behavior
  const lastPageRequestBody = {
    page: pages as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const lastPage: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.index(
      connection,
      {
        reportId,
        body: lastPageRequestBody,
      },
    );
  typia.assert(lastPage);

  const expectedLastPageCount = records % limit === 0 ? limit : records % limit;

  TestValidator.equals(
    "last page item count should be limit or remaining records",
    lastPage.data.length,
    expectedLastPageCount,
  );

  // 7. Out-of-range page index behavior (page > pages)
  const outOfRangePage = pages + 1;
  const outOfRangeRequestBody = {
    page: outOfRangePage as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const outOfRangePageResult: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.index(
      connection,
      {
        reportId,
        body: outOfRangeRequestBody,
      },
    );
  typia.assert(outOfRangePageResult);

  const outPagination = outOfRangePageResult.pagination;

  TestValidator.equals(
    "out-of-range pagination.records should still equal totalActions",
    outPagination.records,
    totalActions,
  );

  TestValidator.equals(
    "out-of-range pagination.pages should remain consistent",
    outPagination.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "out-of-range page should either clamp to valid range or return empty data",
    outOfRangePageResult.data.length === 0 ||
      outPagination.current === pages ||
      outPagination.current === outOfRangePage,
  );
}
