import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_moderator_report_update_permission_scope_by_community(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticated)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a shared report reason category
  const reasonCategoryBody = {
    code: `code_${RandomGenerator.alphabets(8)}`,
    name: "Abuse / Harassment",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reasonCategoryBody },
    );
  typia.assert(reasonCategory);

  // 3. Member A joins
  const memberAJoinBody = {
    username: `memberA_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "MemberA123!",
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 4. Member A creates Community A
  const communityACreateBody = {
    identifier: `community-a-${RandomGenerator.alphabets(6)}`,
    title: "Community A",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityACreateBody },
    );
  typia.assert(communityA);

  // 5. Member B joins
  const memberBJoinBody = {
    username: `memberB_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "MemberB123!",
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 6. Member B logs in to ensure token handling works
  const memberBLoginBody = {
    identifier: memberBJoinBody.email,
    password: memberBJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberBLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLoggedIn);

  // 7. Member B creates Community B
  const communityBCreateBody = {
    identifier: `community-b-${RandomGenerator.alphabets(6)}`,
    title: "Community B",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBCreateBody },
    );
  typia.assert(communityB);

  // 8. Member A logs in (to ensure actor switch) and creates post in Community A
  const memberALoginBody = {
    identifier: memberAJoinBody.email,
    password: memberAJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoggedIn);

  const postACreateBody = {
    community_id: communityA.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Post in Community A",
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postACreateBody,
    });
  typia.assert(postA);

  // 9. Member B (already logged in) creates post in Community B
  const postBCreateBody = {
    community_id: communityB.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Post in Community B",
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBCreateBody,
    });
  typia.assert(postB);

  // 10. Member A logs in again (ensure actor) and creates report in Community A
  const memberALoggedInAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoggedInAgain);

  const reportACreateBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: communityA.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportA: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportACreateBody,
      },
    );
  typia.assert(reportA);

  // 11. Member B logs in and creates report in Community B
  const reportBCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: communityB.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportB: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBCreateBody,
      },
    );
  typia.assert(reportB);

  // 12. Community moderator joins
  const moderatorJoinBody = {
    username: `moderator_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com`,
    password: "Moderator123!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.example.com/register",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 13. Platform admin logs in again and assigns moderator to Community A only
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  const moderatorAssignmentBody = {
    communityModeratorId: moderator.id,
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: moderatorAssignmentBody,
      },
    );
  typia.assert(moderatorAssignment);

  // 14. Community moderator logs in to perform updates
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  // 15. Moderator successfully updates report in Community A
  const updateReportABody = {
    status: "under_review",
    severity: "high",
    report_reason_category_id: reasonCategory.id,
    community_id: communityA.id,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.IUpdate;

  const updatedReportA: ICommunityPlatformReport =
    await api.functional.communityPlatform.communityModerator.reports.update(
      connection,
      {
        reportId: reportA.id,
        body: updateReportABody,
      },
    );
  typia.assert(updatedReportA);

  TestValidator.equals(
    "status updated for in-scope report",
    updatedReportA.status,
    updateReportABody.status,
  );

  TestValidator.equals(
    "severity updated for in-scope report",
    updatedReportA.severity,
    updateReportABody.severity,
  );

  TestValidator.equals(
    "description updated for in-scope report",
    updatedReportA.description,
    updateReportABody.description,
  );

  // 16. Moderator attempts to update report in Community B (out of scope) and should fail
  const updateReportBBody = {
    status: "under_review",
    severity: "medium",
    report_reason_category_id: reasonCategory.id,
    community_id: communityB.id,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.IUpdate;

  await TestValidator.error(
    "out-of-scope report update must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.update(
        connection,
        {
          reportId: reportB.id,
          body: updateReportBBody,
        },
      );
    },
  );
}
