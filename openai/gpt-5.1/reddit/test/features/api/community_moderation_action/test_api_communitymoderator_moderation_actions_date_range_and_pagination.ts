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
 * Validate community moderator moderation actions search by date range and
 * pagination.
 *
 * Business flow:
 *
 * 1. Register a community moderator and keep credentials.
 * 2. Register a member user and keep credentials.
 * 3. As the member user, create a report.
 * 4. As the community moderator, create 12 moderation actions for that report.
 * 5. Query moderation actions with a date range that includes all actions, with
 *    page/limit and sorting.
 * 6. Assert pagination metadata and ordering for pages 1–3, and that there is no
 *    overlap between pages.
 * 7. Perform a narrower date range query and assert filtered results and
 *    pagination adjustments.
 */
export async function test_api_communitymoderator_moderation_actions_date_range_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register community moderator
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword: string = "Passw0rd!";

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 2. Register member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = "Passw0rd!";

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/member/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Explicit member login to simulate a separate session
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. Create a report as member user
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
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

  // Switch to moderator
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: "https://community.example.com/moderator/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 5. Create 12 moderation actions for the report as moderator
  const createdActions: ICommunityPlatformModerationAction[] = [];

  for (let i = 0; i < 12; i++) {
    const actionBody = {
      community_id: null,
      action_type: i % 2 === 0 ? "warn_user" : "remove_content",
      target_scope: "post",
      reason_summary: `Automated test action #${i + 1}`,
      notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformModerationAction.ICreate;

    const action: ICommunityPlatformModerationAction =
      await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
        connection,
        {
          reportId: report.id,
          body: actionBody,
        },
      );
    typia.assert(action);
    createdActions.push(action);
  }

  // 6. Query moderation actions with a wide date range that should include all created actions.
  const fromCreatedAt: string & tags.Format<"date-time"> = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString() as string & tags.Format<"date-time">; // 24 hours ago
  const toCreatedAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString() as string & tags.Format<"date-time">; // 24 hours ahead

  const baseRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    actionTypes: undefined,
    targetScopes: undefined,
    communityId: undefined,
    reportId: report.id,
    actorType: "communityModerator",
    actorId: moderatorAuthorized.id,
    fromCreatedAt,
    toCreatedAt,
    search: undefined,
    sortField: "created_at",
    sortDirection: "asc",
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const page1: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.moderationActions.index(
      connection,
      {
        body: baseRequestBody,
      },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  TestValidator.equals("page1.current should be 1", pagination1.current, 1);
  TestValidator.equals("page1.limit should be 5", pagination1.limit, 5);
  TestValidator.predicate(
    "page1.records should be at least 12",
    pagination1.records >= 12,
  );
  TestValidator.predicate(
    "page1.pages should be at least 3",
    pagination1.pages >= 3,
  );

  const page1Data = page1.data;
  TestValidator.predicate("page1 data length <= 5", page1Data.length <= 5);

  // Assert ascending order by performedAt
  for (let i = 1; i < page1Data.length; i++) {
    const prev = page1Data[i - 1].performedAt;
    const curr = page1Data[i].performedAt;
    TestValidator.predicate(
      `page1 performedAt ascending at index ${i}`,
      new Date(prev).getTime() <= new Date(curr).getTime(),
    );
  }

  // 7. Request page 2 and 3
  const page2Body = {
    ...baseRequestBody,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformModerationAction.IRequest;
  const page3Body = {
    ...baseRequestBody,
    page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const page2: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.moderationActions.index(
      connection,
      {
        body: page2Body,
      },
    );
  typia.assert(page2);

  const page3: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.moderationActions.index(
      connection,
      {
        body: page3Body,
      },
    );
  typia.assert(page3);

  const page2Data = page2.data;
  const page3Data = page3.data;

  TestValidator.predicate("page2 data length <= 5", page2Data.length <= 5);
  TestValidator.predicate("page3 data length <= 5", page3Data.length <= 5);

  // All actions across pages must be within the from/to range
  const allPages = [...page1Data, ...page2Data, ...page3Data];
  for (const item of allPages) {
    const performedAtTime = new Date(item.performedAt).getTime();
    TestValidator.predicate(
      "performedAt should be >= fromCreatedAt",
      performedAtTime >= new Date(fromCreatedAt).getTime(),
    );
    TestValidator.predicate(
      "performedAt should be <= toCreatedAt",
      performedAtTime <= new Date(toCreatedAt).getTime(),
    );
  }

  // Ensure no overlap of records between pages 1-3
  const seenIds = new Set<string>();
  for (const [index, pageItems] of [
    page1Data,
    page2Data,
    page3Data,
  ].entries()) {
    for (const item of pageItems) {
      TestValidator.predicate(
        `no duplicate id across pages at page index ${index + 1}`,
        seenIds.has(item.id) === false,
      );
      seenIds.add(item.id);
    }
  }

  // 8. Optional: narrower date range excluding earliest and latest actions from combined pages
  if (allPages.length >= 3) {
    const sortedAll = [...allPages].sort((a, b) => {
      return (
        new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
      );
    });

    const innerFrom = sortedAll[1].performedAt;
    const innerTo = sortedAll[sortedAll.length - 2].performedAt;

    const narrowRequestBody = {
      ...baseRequestBody,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      fromCreatedAt: innerFrom,
      toCreatedAt: innerTo,
    } satisfies ICommunityPlatformModerationAction.IRequest;

    const narrowPage: IPageICommunityPlatformModerationAction.ISummary =
      await api.functional.communityPlatform.communityModerator.moderationActions.index(
        connection,
        {
          body: narrowRequestBody,
        },
      );
    typia.assert(narrowPage);

    const narrowPagination = narrowPage.pagination;

    TestValidator.predicate(
      "narrow records <= original records",
      narrowPagination.records <= pagination1.records,
    );

    for (const item of narrowPage.data) {
      const t = new Date(item.performedAt).getTime();
      TestValidator.predicate(
        "narrow performedAt >= innerFrom",
        t >= new Date(innerFrom).getTime(),
      );
      TestValidator.predicate(
        "narrow performedAt <= innerTo",
        t <= new Date(innerTo).getTime(),
      );
    }
  }
}
