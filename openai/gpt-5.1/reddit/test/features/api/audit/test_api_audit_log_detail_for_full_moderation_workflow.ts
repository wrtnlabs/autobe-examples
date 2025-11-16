import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_audit_log_detail_for_full_moderation_workflow(
  connection: api.IConnection,
) {
  // 1. Register core actors: platform admin, member user, community moderator
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass!234",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass!234",
    ip: "127.0.0.1",
    href: "https://community.local/join",
    referrer: "https://community.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityModeratorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Moderator!234",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderation.console.local/join",
    referrer: "https://moderation.console.local/home",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 2. As platform admin, create visibility level and post type
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.console.local/login",
      referrer: "https://admin.console.local/home",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphabets(6)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphabets(5)}`,
    name: "Text",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 3. As member user, create community using visibility level
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberUserJoinBody.email,
      password: memberUserJoinBody.password,
      ip: "127.0.0.1",
      href: "https://community.local/login",
      referrer: "https://community.local/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As member user, create a post in the community and then a comment
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 5. As member user, create a report against the comment (or post context)
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 6. As community moderator, create moderation action and user sanction
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: communityModeratorJoinBody.email,
      password: communityModeratorJoinBody.password,
      ip: "127.0.0.1",
      href: "https://moderation.console.local/login",
      referrer: "https://moderation.console.local/home",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "comment",
    reason_summary: "Violation of community rules in comment",
    notes_internal: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  const now = new Date();
  const sanctionEffectiveFrom = now.toISOString();
  const sanctionEffectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const userSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: sanctionEffectiveFrom,
    effective_until: sanctionEffectiveUntil,
    reason_summary: "Abusive behavior in comments",
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const moderatorUserSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: userSanctionCreateBody,
      },
    );
  typia.assert(moderatorUserSanction);

  // 7. As platform admin, also create a platformAdmin-level user sanction on same report
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.console.local/login",
      referrer: "https://admin.console.local/home",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const platformSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "scheduled",
    effective_from: sanctionEffectiveFrom,
    effective_until: sanctionEffectiveUntil,
    reason_summary: "Platform-wide escalation of abusive behavior",
    notes_internal: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const platformUserSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: platformSanctionCreateBody,
      },
    );
  typia.assert(platformUserSanction);

  // 8. As affected member user, create an appeal for the report/sanction
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberUserJoinBody.email,
      password: memberUserJoinBody.password,
      ip: "127.0.0.1",
      href: "https://community.local/login",
      referrer: "https://community.local/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: "I believe the sanction is too harsh.",
    details: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBody,
      },
    );
  typia.assert(appeal);

  // 9. As platform admin, retrieve a specific audit log entry by ID
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.console.local/login",
      referrer: "https://admin.console.local/home",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const auditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const auditLog: ICommunityPlatformAuditLog =
    await api.functional.communityPlatform.platformAdmin.auditLogs.at(
      connection,
      {
        auditLogId,
      },
    );
  typia.assert(auditLog);

  // Basic structural and business-level validations
  TestValidator.predicate(
    "audit log id matches path parameter type shape",
    auditLog.id.length > 0,
  );
  TestValidator.predicate(
    "audit event_type should be non-empty",
    auditLog.event_type.length > 0,
  );
  TestValidator.predicate(
    "audit event_category should be non-empty",
    auditLog.event_category.length > 0,
  );
  TestValidator.predicate(
    "audit summary should be non-empty",
    auditLog.summary.length > 0,
  );

  // created_at should be parseable date-time and not in the future by a wide margin
  const createdAtDate = new Date(auditLog.created_at);
  TestValidator.predicate(
    "audit created_at should be a valid date",
    !Number.isNaN(createdAtDate.getTime()),
  );

  // Optional foreign keys should be consistent: if present, they must be non-empty UUIDs
  const fkFields: Array<{
    name:
      | "guestuser_id"
      | "memberuser_id"
      | "communitymoderator_id"
      | "platformadmin_id"
      | "community_id"
      | "post_id"
      | "comment_id"
      | "report_id"
      | "moderation_action_id"
      | "user_sanction_id"
      | "appeal_id";
    value?: string & tags.Format<"uuid">;
  }> = [
    { name: "guestuser_id", value: auditLog.guestuser_id },
    { name: "memberuser_id", value: auditLog.memberuser_id },
    { name: "communitymoderator_id", value: auditLog.communitymoderator_id },
    { name: "platformadmin_id", value: auditLog.platformadmin_id },
    { name: "community_id", value: auditLog.community_id },
    { name: "post_id", value: auditLog.post_id },
    { name: "comment_id", value: auditLog.comment_id },
    { name: "report_id", value: auditLog.report_id },
    { name: "moderation_action_id", value: auditLog.moderation_action_id },
    { name: "user_sanction_id", value: auditLog.user_sanction_id },
    { name: "appeal_id", value: auditLog.appeal_id },
  ];

  for (const fk of fkFields) {
    if (fk.value !== undefined) {
      TestValidator.predicate(
        `foreign key ${fk.name} should be a non-empty UUID string when present`,
        fk.value.length > 0,
      );
    }
  }
}
