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

export async function test_api_platform_admin_moderation_actions_index_with_filters_and_sorting(
  connection: api.IConnection,
) {
  // 1. Member user joins and logs in
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    { body: memberJoinInput },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Member creates a report
  const reportCreateInput = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateInput },
    );
  typia.assert(report);

  const reportId = report.id;

  // 3. Register a platform admin (join) and use that actor
  const adminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "203.0.113.10",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    { body: adminJoinInput },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 4. Create multiple moderation actions under the same report as platformAdmin
  const actionTypes = ["warn_user", "remove_content", "ban_user"] as const;
  const targetScopes = ["user", "post"] as const;

  const createdActions: ICommunityPlatformModerationAction[] = [];

  for (let i = 0; i < 6; i++) {
    const actionType = actionTypes[i % actionTypes.length];
    const targetScope = targetScopes[i % targetScopes.length];

    const createBody = {
      community_id: null,
      action_type: actionType,
      target_scope: targetScope,
      reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
      notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformModerationAction.ICreate;

    const created =
      await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
        connection,
        {
          reportId,
          body: createBody,
        },
      );
    typia.assert<ICommunityPlatformModerationAction>(created);
    createdActions.push(created);
  }

  // Sanity check: we have 6 actions
  TestValidator.equals(
    "created moderation actions count",
    createdActions.length,
    6,
  );

  // Helper to fetch index with body
  const fetchIndex = async (
    body: ICommunityPlatformModerationAction.IRequest,
  ): Promise<IPageICommunityPlatformModerationAction.ISummary> => {
    const page =
      await api.functional.communityPlatform.platformAdmin.reports.moderationActions.index(
        connection,
        {
          reportId,
          body,
        },
      );
    typia.assert<IPageICommunityPlatformModerationAction.ISummary>(page);
    return page;
  };

  // 5-a. Filter by actionTypes and targetScopes
  const filterBody = {
    page: 1,
    limit: 20,
    actionTypes: ["warn_user"],
    targetScopes: ["user"],
    communityId: undefined,
    reportId: undefined,
    actorType: undefined,
    actorId: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    search: undefined,
    sortField: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const filteredPage = await fetchIndex(filterBody);

  const filteredData = filteredPage.data;
  TestValidator.predicate(
    "filtered list is not empty",
    filteredData.length > 0,
  );

  for (const summary of filteredData) {
    TestValidator.equals(
      "actionType matches filter",
      summary.actionType,
      "warn_user",
    );
    TestValidator.equals(
      "targetType matches filter",
      summary.targetType,
      "user",
    );
  }

  // 5-b. Sorting by created_at/performedAt ascending
  const sortAscBody = {
    page: 1,
    limit: 20,
    sortField: "created_at",
    sortDirection: "asc",
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const ascPage = await fetchIndex(sortAscBody);
  const ascData = ascPage.data;

  TestValidator.predicate(
    "asc sorted list has at least 2 items",
    ascData.length >= 2,
  );

  for (let i = 1; i < ascData.length; i++) {
    const prev = ascData[i - 1].performedAt;
    const curr = ascData[i].performedAt;
    TestValidator.predicate(
      "performedAt is non-decreasing in asc order",
      prev <= curr,
    );
  }

  // 5-c. Sorting by created_at/performedAt descending
  const sortDescBody = {
    page: 1,
    limit: 20,
    sortField: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const descPage = await fetchIndex(sortDescBody);
  const descData = descPage.data;

  TestValidator.predicate(
    "desc sorted list has at least 2 items",
    descData.length >= 2,
  );

  for (let i = 1; i < descData.length; i++) {
    const prev = descData[i - 1].performedAt;
    const curr = descData[i].performedAt;
    TestValidator.predicate(
      "performedAt is non-increasing in desc order",
      prev >= curr,
    );
  }

  // 5-d. Use fromCreatedAt and toCreatedAt to restrict time window
  const anchorIndex = Math.min(ascData.length - 1, 2);
  const anchorAction = ascData[anchorIndex];
  const anchorTime = anchorAction.performedAt;

  const windowBody = {
    page: 1,
    limit: 20,
    fromCreatedAt: anchorTime,
    toCreatedAt: anchorTime,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const windowPage = await fetchIndex(windowBody);
  const windowData = windowPage.data;

  for (const summary of windowData) {
    TestValidator.predicate(
      "summary.performedAt is within window",
      summary.performedAt >= anchorTime && summary.performedAt <= anchorTime,
    );
  }
}
