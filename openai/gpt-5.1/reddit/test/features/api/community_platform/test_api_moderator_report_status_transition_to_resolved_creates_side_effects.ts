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
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";
import type { IPageICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSanction";

export async function test_api_moderator_report_status_transition_to_resolved_creates_side_effects(
  connection: api.IConnection,
) {
  // 1. Register a member user (reporter)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register a platform admin and login explicitly
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://community.example.com/admin/join",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 3. As platform admin, create a report reason category
  const reportReasonCategoryCreateBody = {
    code: `spam_${RandomGenerator.alphaNumeric(6)}`,
    name: "Spam or misleading",
    description:
      "Reports about spammy, repetitive, or misleading content in the community.",
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reportReasonCategoryCreateBody,
      },
    );
  typia.assert(reasonCategory);

  // 4. Explicit member login (even though join already issued a token)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. As member user, create a report using the reason category
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  TestValidator.equals(
    "created report reason category should match",
    createdReport.reason_category?.id ?? null,
    reasonCategory.id,
  );

  // 6. Create a community moderator and login
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/moderation",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.example.com/moderator/login",
    referrer: "https://community.example.com/moderation",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 7. As community moderator, transition report to a resolved status
  const resolvedStatus = "resolved_content_action";
  const updatedSeverity = "high";

  const reportUpdateBody = {
    status: resolvedStatus,
    severity: updatedSeverity,
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    description: createdReport.description ?? undefined,
  } satisfies ICommunityPlatformReport.IUpdate;

  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.communityModerator.reports.update(
      connection,
      {
        reportId: createdReport.id,
        body: reportUpdateBody,
      },
    );
  typia.assert(updatedReport);

  TestValidator.equals(
    "updated report id should remain the same",
    updatedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "report status should be updated to resolved state",
    updatedReport.status,
    resolvedStatus,
  );

  TestValidator.equals(
    "report severity should be updated",
    updatedReport.severity ?? null,
    updatedSeverity,
  );

  TestValidator.predicate(
    "resolved_at should be populated after resolving the report",
    updatedReport.resolved_at !== null &&
      updatedReport.resolved_at !== undefined,
  );

  // 8. Create a moderation action for the report
  const moderationActionCreateBody = {
    community_id: updatedReport.context_community?.id ?? null,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Removed reported content based on policy.",
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdModerationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: updatedReport.id as string & tags.Format<"uuid">,
        body: moderationActionCreateBody,
      },
    );
  typia.assert(createdModerationAction);

  TestValidator.equals(
    "moderation action should reference the report id",
    createdModerationAction.community_platform_report_id,
    updatedReport.id,
  );

  // 9. List moderation actions for the report and validate side-effects
  const moderationActionsIndexBody = {
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

  const moderationActionsPage: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.index(
      connection,
      {
        reportId: updatedReport.id,
        body: moderationActionsIndexBody,
      },
    );
  typia.assert(moderationActionsPage);

  TestValidator.predicate(
    "at least one moderation action should exist for the resolved report",
    moderationActionsPage.pagination.records >= 1 &&
      moderationActionsPage.data.length >= 1,
  );

  const firstModerationActionSummary = moderationActionsPage.data[0];
  typia.assert(firstModerationActionSummary);

  TestValidator.equals(
    "first moderation action summary id should match created moderation action id or at least be non-empty",
    firstModerationActionSummary.id,
    createdModerationAction.id,
  );

  // 10. List user sanctions associated with the report
  const userSanctionsIndexBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sanction_type: null,
    status: null,
    community_id: null,
    sanctioned_memberuser_id: null,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformUserSanction.IRequest;

  const userSanctionsPage: IPageICommunityPlatformUserSanction.ISummary =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.index(
      connection,
      {
        reportId: updatedReport.id as string & tags.Format<"uuid">,
        body: userSanctionsIndexBody,
      },
    );
  typia.assert(userSanctionsPage);

  TestValidator.predicate(
    "user sanctions pagination should have non-negative records",
    userSanctionsPage.pagination.records >= 0,
  );

  // If any sanctions exist, they should all reference our reportId
  if (userSanctionsPage.data.length > 0) {
    for (const sanction of userSanctionsPage.data) {
      typia.assert(sanction);
      TestValidator.equals(
        "sanction reportId should match updated report id",
        sanction.reportId,
        updatedReport.id,
      );
    }
  }
}
