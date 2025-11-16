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

export async function test_api_platform_admin_moderation_actions_index_security_scope_to_report(
  connection: api.IConnection,
) {
  // 1. Register a member user (reporter)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As member user, create two reports
  const commonReasonCategoryId = typia.random<string & tags.Format<"uuid">>();

  const reportCreateBodyA = {
    reporter_type: "member",
    report_reason_category_id: commonReasonCategoryId,
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportA: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBodyA,
      },
    );
  typia.assert(reportA);

  const reportCreateBodyB = {
    reporter_type: "member",
    report_reason_category_id: commonReasonCategoryId,
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportB: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBodyB,
      },
    );
  typia.assert(reportB);

  // 3. Switch to platform admin actor
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Create moderation actions: two for reportA, one for reportB
  const actionTypeForReportA = "remove_content";
  const targetScopeForReportA = "post";

  const modActionCreateBodyA1 = {
    community_id: null,
    action_type: actionTypeForReportA,
    target_scope: targetScopeForReportA,
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationActionA1: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: reportA.id,
        body: modActionCreateBodyA1,
      },
    );
  typia.assert(moderationActionA1);

  const modActionCreateBodyA2 = {
    community_id: null,
    action_type: actionTypeForReportA,
    target_scope: targetScopeForReportA,
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationActionA2: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: reportA.id,
        body: modActionCreateBodyA2,
      },
    );
  typia.assert(moderationActionA2);

  const actionTypeForReportB = "warn_user";
  const targetScopeForReportB = "user";

  const modActionCreateBodyB1 = {
    community_id: null,
    action_type: actionTypeForReportB,
    target_scope: targetScopeForReportB,
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationActionB1: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: reportB.id,
        body: modActionCreateBodyB1,
      },
    );
  typia.assert(moderationActionB1);

  // 5. List moderation actions for reportA and verify scoping
  const indexRequestBodyForA = {
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
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const pageForA: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.index(
      connection,
      {
        reportId: reportA.id,
        body: indexRequestBodyForA,
      },
    );
  typia.assert(pageForA);

  const moderationIdsForA = pageForA.data.map((item) => item.id);

  TestValidator.equals(
    "pagination.records for reportA should equal number of created actions",
    pageForA.pagination.records,
    2,
  );

  TestValidator.equals(
    "data length for reportA should equal number of created actions",
    pageForA.data.length,
    2,
  );

  TestValidator.predicate(
    "moderation actions for reportA should include both created IDs and not include reportB's ID",
    moderationIdsForA.includes(moderationActionA1.id) &&
      moderationIdsForA.includes(moderationActionA2.id) &&
      !moderationIdsForA.includes(moderationActionB1.id),
  );

  // 6. List moderation actions for reportB and verify scoping
  const indexRequestBodyForB = {
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
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const pageForB: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.index(
      connection,
      {
        reportId: reportB.id,
        body: indexRequestBodyForB,
      },
    );
  typia.assert(pageForB);

  const moderationIdsForB = pageForB.data.map((item) => item.id);

  TestValidator.equals(
    "pagination.records for reportB should equal number of created actions",
    pageForB.pagination.records,
    1,
  );

  TestValidator.equals(
    "data length for reportB should equal number of created actions",
    pageForB.data.length,
    1,
  );

  TestValidator.predicate(
    "moderation actions for reportB should contain only its own action ID",
    moderationIdsForB.length === 1 &&
      moderationIdsForB[0] === moderationActionB1.id,
  );

  // 7. Filtered call for reportA with actionTypes that do not match and expect empty result
  const indexFilteredBodyForA = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    actionTypes: ["escalate"],
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
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const pageFilteredForA: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.index(
      connection,
      {
        reportId: reportA.id,
        body: indexFilteredBodyForA,
      },
    );
  typia.assert(pageFilteredForA);

  TestValidator.equals(
    "filtered pagination.records for reportA should be 0 when no actionTypes match",
    pageFilteredForA.pagination.records,
    0,
  );

  TestValidator.equals(
    "filtered data length for reportA should be 0 when no actionTypes match",
    pageFilteredForA.data.length,
    0,
  );
}
