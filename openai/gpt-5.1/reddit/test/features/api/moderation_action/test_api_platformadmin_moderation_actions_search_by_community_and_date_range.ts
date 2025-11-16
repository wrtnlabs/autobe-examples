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

export async function test_api_platformadmin_moderation_actions_search_by_community_and_date_range(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a visibility level
  const visibilityLevelBody = {
    code: `code_${RandomGenerator.alphabets(6)}`,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedJoin);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.app.local/login",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedLogin);

  // 4. Create two communities with the created visibility level code
  const communityCreateBase = {
    description: RandomGenerator.paragraph({ sentences: 6 }),
    isNsfw: false,
    primaryTagIds: [],
  } satisfies Pick<
    ICommunityPlatformCommunity.ICreate,
    "description" | "isNsfw" | "primaryTagIds"
  >;

  const community1Body = {
    identifier: `comm_${RandomGenerator.alphabets(6)}`,
    title: `Community ${RandomGenerator.name(1)}`,
    visibilityLevelCode: visibilityLevel.code,
    description: communityCreateBase.description,
    isNsfw: communityCreateBase.isNsfw,
    primaryTagIds: communityCreateBase.primaryTagIds,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: community1Body,
      },
    );
  typia.assert(community1);

  const community2Body = {
    identifier: `comm_${RandomGenerator.alphabets(6)}`,
    title: `Community ${RandomGenerator.name(1)}`,
    visibilityLevelCode: visibilityLevel.code,
    description: communityCreateBase.description,
    isNsfw: communityCreateBase.isNsfw,
    primaryTagIds: communityCreateBase.primaryTagIds,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: community2Body,
      },
    );
  typia.assert(community2);

  // 5. As member user, create two reports in different communities
  const report1Body = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community1.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report1: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: report1Body,
      },
    );
  typia.assert(report1);

  const report2Body = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community2.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report2: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: report2Body,
      },
    );
  typia.assert(report2);

  // 6. Switch back to platform admin (login) to create moderation actions
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/home",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // Capture time window and create moderation actions
  const nowBeforeActions: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const action1Body = {
    community_id: community1.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Violation in community 1",
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const action1: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report1.id,
        body: action1Body,
      },
    );
  typia.assert(action1);

  const midTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  void midTimestamp;

  const action2Body = {
    community_id: community2.id,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: "Violation in community 2",
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const action2: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report2.id,
        body: action2Body,
      },
    );
  typia.assert(action2);
  void action2;

  const nowAfterActions: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 7. Call moderationActions.index filtered by community1 and date range
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    communityId: community1.id,
    fromCreatedAt: nowBeforeActions,
    toCreatedAt: nowAfterActions,
    actionTypes: undefined,
    targetScopes: undefined,
    reportId: undefined,
    actorType: undefined,
    actorId: undefined,
    search: undefined,
    sortField: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const pageResult: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationActions.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const summaries = pageResult.data;

  // 8. Assert that all returned summaries belong to community1 and none from community2
  await ArrayUtil.asyncForEach(summaries, async (summary) => {
    typia.assert<ICommunityPlatformModerationAction.ISummary>(summary);
    if (summary.community !== undefined && summary.community !== null) {
      TestValidator.equals(
        "summary community id matches filter community1.id",
        summary.community.id,
        community1.id,
      );
    }
    TestValidator.notEquals(
      "summary community must not match community2.id",
      summary.community?.id ?? null,
      community2.id,
    );
  });

  // Ensure at least one result and that action1 is present
  TestValidator.predicate(
    "at least one moderation action returned for community1",
    summaries.length > 0,
  );

  const foundAction1 = summaries.find((s) => s.id === action1.id);
  TestValidator.predicate(
    "action1 should be present in filtered results",
    foundAction1 !== undefined,
  );

  // 9. Verify performedAt within requested range and pagination correctness
  await ArrayUtil.asyncForEach(summaries, async (summary) => {
    const performedAt = summary.performedAt;
    TestValidator.predicate(
      "performedAt is >= fromCreatedAt",
      performedAt >= requestBody.fromCreatedAt!,
    );
    TestValidator.predicate(
      "performedAt is <= toCreatedAt",
      performedAt <= requestBody.toCreatedAt!,
    );
  });

  const pagination = pageResult.pagination;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit >= number of returned records",
    pagination.limit >= summaries.length,
  );
}
