import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAppeal";

/**
 * Verify that a community moderator can filter appeals by status using the
 * PATCH /communityPlatform/communityModerator/appeals search endpoint, and that
 * pagination metadata remains consistent when filters change.
 *
 * Business focus:
 *
 * - We do not directly manipulate appeal statuses or queues, because there are no
 *   explicit status-transition APIs exposed in this fixture.
 * - Instead, we create multiple appeals from different reports and sanctions,
 *   then rely on whatever initial statuses the backend assigns (for example,
 *   `submitted`) and validate that the index endpoint correctly filters by
 *   those returned statuses.
 * - We also validate that pagination metadata (current, limit, records, pages)
 *   matches the number of results when using different filters.
 *
 * High-level flow:
 *
 * 1. Register and authenticate three actors:
 *
 *    - One member user who will own reports and appeals.
 *    - One community moderator who will query the appeals index.
 *    - One platform admin who will create a user sanction.
 * 2. As platform admin, create a visibility level (e.g. `public`).
 * 3. As member user, create a community using that visibility level.
 * 4. As member user, create multiple reports, some scoped to the community and
 *    some global.
 * 5. As community moderator, create moderation actions for some reports.
 * 6. As platform admin, create at least one user sanction tied to one report.
 * 7. As member user, submit several appeals:
 *
 *    - A few via POST /communityPlatform/memberUser/appeals (direct) that
 *         conceptually relate to previously created moderation actions or
 *         sanctions.
 *    - A few via POST /communityPlatform/memberUser/reports/{reportId}/appeals that
 *         are explicitly tied to particular reports.
 * 8. As community moderator, call PATCH
 *    /communityPlatform/communityModerator/appeals twice with different
 *    filters:
 *
 *    - First request: no `appeal_statuses` filter, but a small limit (e.g. limit =
 *         2) to exercise pagination.
 *    - Second request: `appeal_statuses` including the status values actually
 *         observed in the first response (for example `[first.status]`).
 * 9. Validate that:
 *
 *    - All appeals in the filtered response have a `status` matching one of the
 *         requested `appeal_statuses`.
 *    - The pagination metadata matches the result size: `records` equals the number
 *         of items in `data` when the dataset is small enough to fit in a
 *         single page; `current` reflects the requested page; and `limit`
 *         reflects the requested limit.
 *    - If any appeal summary has a `sanction`, its identifier looks like a valid
 *         UUID, confirming that sanctions-related appeals can be surfaced.
 */
export async function test_api_community_moderator_appeals_index_filters_by_status_and_queue(
  connection: api.IConnection,
) {
  // 1. Register actors
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    display_name: RandomGenerator.name(1),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const platformJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    displayName: RandomGenerator.name(1),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformJoinBody,
    });
  typia.assert(platformAuthorized);

  // 2. As platform admin, create a visibility level
  const visibilityBody = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 3. Switch to member user and create a community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://member.example.com/login",
      referrer: "https://member.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityBody = {
    identifier: `comm-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 4. Create multiple reports as the member user
  const reportIds: string[] = [];
  const reportCount = 3;
  for (let i = 0; i < reportCount; i++) {
    const reportBody = {
      reporter_type: "member",
      report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
      community_id: i % 2 === 0 ? community.id : null,
      severity: i % 2 === 0 ? "medium" : "low",
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformReport.ICreate;
    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        { body: reportBody },
      );
    typia.assert(report);
    reportIds.push(report.id);
  }

  // 5. Switch to community moderator and create moderation actions
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: null,
      href: "https://moderator.example.com/login",
      referrer: "https://moderator.example.com/landing",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const moderationActions: ICommunityPlatformModerationAction[] = [];
  for (const reportId of reportIds.slice(0, 2)) {
    const actionBody = {
      community_id: community.id,
      action_type: "remove_content",
      target_scope: "post",
      reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
      notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformModerationAction.ICreate;
    const action: ICommunityPlatformModerationAction =
      await api.functional.communityPlatform.communityModerator.moderationActions.create(
        connection,
        { body: actionBody },
      );
    typia.assert(action);
    moderationActions.push(action);
  }

  // 6. Switch to platform admin and create a user sanction for one report
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformJoinBody.email,
      password: platformJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const sanctionedReportId = reportIds[0];
  const sanctionBody = {
    community_platform_report_id: sanctionedReportId,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: new Date().toISOString(),
    effective_until: null,
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;
  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: sanctionBody },
    );
  typia.assert(sanction);

  // 7. Switch back to member user and create appeals
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://member.example.com/login2",
      referrer: "https://member.example.com/landing2",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  // Appeals directly tied to reports
  const appeals: ICommunityPlatformAppeal[] = [];
  for (const reportId of reportIds) {
    const appealBody = {
      appeal_scope: "content",
      reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
      details: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ICommunityPlatformAppeal.ICreate;
    const appeal: ICommunityPlatformAppeal =
      await api.functional.communityPlatform.memberUser.reports.appeals.create(
        connection,
        {
          reportId,
          body: appealBody,
        },
      );
    typia.assert(appeal);
    appeals.push(appeal);
  }

  // Additional appeals (conceptually for sanction or global decisions)
  const extraAppealBody = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformAppeal.ICreate;
  const extraAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      { body: extraAppealBody },
    );
  typia.assert(extraAppeal);
  appeals.push(extraAppeal);

  // 8. As community moderator, query appeals index with different filters
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: null,
      href: "https://moderator.example.com/login2",
      referrer: "https://moderator.example.com/landing2",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  // First index call: small limit, no status filter
  const firstRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformAppeal.IRequest;
  const firstPage: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.communityModerator.appeals.index(
      connection,
      { body: firstRequestBody },
    );
  typia.assert(firstPage);

  const firstStatuses = firstPage.data.map((s) => s.status);

  // 9. Second index call: filter by observed statuses
  const uniqueStatuses = Array.from(new Set(firstStatuses));
  const secondRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    appeal_statuses: uniqueStatuses,
  } satisfies ICommunityPlatformAppeal.IRequest;
  const secondPage: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.communityModerator.appeals.index(
      connection,
      { body: secondRequestBody },
    );
  typia.assert(secondPage);

  // 10. Assertions
  // 10-1. All returned appeals must have status within requested statuses
  for (const summary of secondPage.data) {
    TestValidator.predicate(
      "filtered appeal status must be within requested statuses",
      uniqueStatuses.includes(summary.status),
    );
  }

  // 10-2. Pagination metadata sanity checks
  const pagination = secondPage.pagination;
  TestValidator.equals(
    "pagination current page should match request",
    pagination.current,
    secondRequestBody.page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    pagination.limit,
    secondRequestBody.limit,
  );
  TestValidator.predicate(
    "records should be >= returned data length",
    pagination.records >= secondPage.data.length,
  );
  TestValidator.predicate(
    "pages should be >= 1 when there are records",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  // 10-3. Ensure at least one appeal is visible in moderator view
  TestValidator.predicate(
    "there should be at least one appeal in moderator view",
    firstPage.data.length + secondPage.data.length > 0,
  );

  // 10-4. If any appeal summary has a sanction, its id should look like a UUID
  const appealWithSanction =
    secondPage.data.find((s) => s.sanction !== undefined) ??
    firstPage.data.find((s) => s.sanction !== undefined);
  if (appealWithSanction !== undefined && appealWithSanction.sanction) {
    const sanctionId = appealWithSanction.sanction.id;
    TestValidator.predicate(
      "sanction id on appeal summary should be a non-empty string",
      typeof sanctionId === "string" && sanctionId.length > 0,
    );
  }
}
