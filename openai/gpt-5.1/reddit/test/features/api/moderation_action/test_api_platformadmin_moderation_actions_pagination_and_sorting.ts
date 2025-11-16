import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

export async function test_api_platformadmin_moderation_actions_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (platformAdmin.join implicitly logs in via token)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.test/join",
    referrer: "https://landing.console.test/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `code_${RandomGenerator.alphabets(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert(visibility);

  // 3. Register and login a member user (community creator and reporter)
  const memberEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(8)}@member.test` as string &
      tags.Format<"email">;

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: "P@ssw0rd!",
    href: "https://community.app.test/join",
    referrer: "https://community.app.test/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    identifier: memberEmail,
    password: "P@ssw0rd!",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. Create a community as the member user, using the created visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 5. Create a report in that community as the member user
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  // 6. Switch back to platform admin (login ensures token for subsequent calls)
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: "P@ssw0rd!",
    href: "https://admin.console.test/login",
    referrer: "https://landing.console.test/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 7. Create multiple moderation actions for that report as platform admin
  const totalActions = 15;
  const createdActions: ICommunityPlatformModerationAction[] = [];

  for (let i = 0; i < totalActions; i++) {
    const actionBody = {
      community_id: community.id,
      action_type: i % 2 === 0 ? "remove_content" : "warn_user",
      target_scope: i % 3 === 0 ? "post" : "comment",
      reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
      notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformModerationAction.ICreate;

    const action: ICommunityPlatformModerationAction =
      await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
        connection,
        {
          reportId: report.id,
          body: actionBody,
        },
      );
    typia.assert(action);
    createdActions.push(action);
  }

  // Ensure we created the expected count
  TestValidator.equals(
    "created moderation actions count",
    createdActions.length,
    totalActions,
  );

  // 8. Query moderation actions as platform admin with pagination and sorting (page 1)
  const requestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    communityId: community.id,
    reportId: report.id,
    sortField: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const page1: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationActions.index(
      connection,
      {
        body: requestPage1,
      },
    );
  typia.assert(page1);

  // Basic pagination assertions for page 1
  TestValidator.equals(
    "page1 pagination current should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 pagination limit should be 10",
    page1.pagination.limit,
    10,
  );

  // page1 data length should be <= 10 and > 0 (since we created 15)
  TestValidator.predicate(
    "page1 should contain at most 10 actions",
    page1.data.length <= 10,
  );
  TestValidator.predicate(
    "page1 should contain at least 1 action",
    page1.data.length >= 1,
  );

  // 9. Verify descending order by performedAt on page1
  for (let i = 1; i < page1.data.length; i++) {
    const prev = page1.data[i - 1].performedAt;
    const curr = page1.data[i].performedAt;
    TestValidator.predicate(
      `page1 performedAt should be descending at index ${i}`,
      prev >= curr,
    );
  }

  // 10. Pagination records and pages sanity check
  TestValidator.predicate(
    "pagination.records should be at least totalActions",
    page1.pagination.records >= totalActions,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 2 when totalActions > limit",
    page1.pagination.pages >= 2,
  );

  // 11. Query second page with same filters and sorting
  const requestPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    communityId: community.id,
    reportId: report.id,
    sortField: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const page2: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationActions.index(
      connection,
      {
        body: requestPage2,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "page2 pagination current should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page2 pagination limit should be 10",
    page2.pagination.limit,
    10,
  );

  // Page2 should have remaining actions (total 15, so page2 should have at least 1)
  TestValidator.predicate(
    "page2 data length should be > 0 when totalActions > limit",
    page2.data.length >= 1,
  );

  // Verify descending order by performedAt on page2
  for (let i = 1; i < page2.data.length; i++) {
    const prev = page2.data[i - 1].performedAt;
    const curr = page2.data[i].performedAt;
    TestValidator.predicate(
      `page2 performedAt should be descending at index ${i}`,
      prev >= curr,
    );
  }

  // 12. Assert that items on page1 and page2 are distinct by id
  const page1Ids = page1.data.map((a) => a.id);
  const page2Ids = page2.data.map((a) => a.id);

  const intersection = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "page1 and page2 should not share moderation action ids",
    intersection.length,
    0,
  );

  // 13. Ensure pages 1 and 2 together cover all newly created moderation actions
  const combinedIds = new Set<string>([...page1Ids, ...page2Ids]);
  const firstCoveredCount = Math.min(totalActions, 20);
  const createdToCheck = createdActions.slice(0, firstCoveredCount);

  for (const action of createdToCheck) {
    TestValidator.predicate(
      "combined pages 1 and 2 should contain created moderation action id",
      combinedIds.has(action.id),
    );
  }
}
