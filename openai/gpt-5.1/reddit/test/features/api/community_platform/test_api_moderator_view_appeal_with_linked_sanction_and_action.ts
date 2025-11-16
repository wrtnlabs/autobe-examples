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
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Moderator views an appeal with linked moderation action and user sanction.
 *
 * Business goal
 *
 * - Ensure that when a moderator fetches an appeal by (reportId, appealId), the
 *   response ICommunityPlatformAppeal correctly joins:
 *
 *   - The originating report,
 *   - A moderation action created on that report, and
 *   - A user sanction created for the reported member user, and that these related
 *       entities appear as summaries inside the appeal.
 *
 * Happy-path workflow
 *
 * 1. Register a member user (join) and treat them as the content owner / sanction
 *    subject.
 * 2. As that member user, create a community.
 * 3. As that member user, create a post inside the community.
 * 4. As that member user, create a generic report (anchored to the community
 *    context).
 * 5. Register a community moderator account and log in as that moderator.
 * 6. As moderator, create a moderation action for the report.
 * 7. As moderator, create a user sanction for the member user on the same report.
 * 8. Log back in as the member user and create an appeal for the report.
 * 9. Log back in as the moderator and fetch the appeal detail by reportId +
 *    appealId.
 * 10. Validate that the appeal joins to the correct report, moderation action, and
 *     user sanction and that the sanction’s subject matches the original member
 *     user.
 */
export async function test_api_moderator_view_appeal_with_linked_sanction_and_action(
  connection: api.IConnection,
) {
  // 1. Member user registration (join)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = "Member#1234";
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 2. Community creation as member user
  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: "public",
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

  // 3. Post creation within the community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Report creation targeting content within that community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
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

  // 5. Community moderator registration
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword = "Moderator#1234";
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // Explicit moderator login (switch actor context)
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/dashboard",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorizedLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorizedLogin);

  // 6. Create moderation action on the report
  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Content violates community rules",
    notes_internal: "Automated rule match + manual confirmation",
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

  // 7. Create user sanction for the member user on the same report
  const now = new Date();
  const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

  const userSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberId,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: now.toISOString(),
    effective_until: later.toISOString(),
    reason_summary: "Multiple violations of community rules",
    notes_internal: "Escalated due to repeated offenses in short timeframe",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: userSanctionCreateBody,
      },
    );
  typia.assert(userSanction);

  // 8. Member user logs in again and files an appeal
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedLogin);

  const createdAppealScope = "sanction";
  const appealCreateBody = {
    appeal_scope: createdAppealScope,
    reason_summary: "I believe the sanction is too harsh for the behavior.",
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBody,
      },
    );
  typia.assert(createdAppeal);

  // 9. Moderator logs back in and fetches the appeal detail
  const moderatorAuthorizedLogin2: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorizedLogin2);

  const appealDetail: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.communityModerator.reports.appeals.at(
      connection,
      {
        reportId: report.id,
        appealId: createdAppeal.id,
      },
    );
  typia.assert(appealDetail);

  // 10. Validation of joins and business expectations

  // 10.1 Appeal is tied to the correct report
  TestValidator.equals(
    "appeal.report.id matches report.id",
    appealDetail.report.id,
    report.id,
  );

  // 10.2 Moderation action summary is present and id matches
  TestValidator.predicate(
    "appeal.moderationAction should be defined",
    appealDetail.moderationAction !== undefined,
  );
  if (appealDetail.moderationAction !== undefined) {
    TestValidator.equals(
      "moderationAction summary id matches created moderationAction.id",
      appealDetail.moderationAction.id,
      moderationAction.id,
    );
  }

  // 10.3 User sanction summary is present and id matches
  TestValidator.predicate(
    "appeal.userSanction should be defined",
    appealDetail.userSanction !== undefined,
  );
  if (appealDetail.userSanction !== undefined) {
    TestValidator.equals(
      "userSanction summary id matches created userSanction.id",
      appealDetail.userSanction.id,
      userSanction.id,
    );

    // 10.4 Sanction subject identity matches the original member user
    TestValidator.equals(
      "userSanction subject.id matches original member user id",
      appealDetail.userSanction.subject.id,
      memberId,
    );
  }

  // 10.5 Appeal scope preserved from creation
  TestValidator.equals(
    "appeal_scope preserved between creation and moderator view",
    appealDetail.appeal_scope,
    createdAppeal.appeal_scope,
  );

  // 10.6 Appeal status is non-empty string (basic sanity check)
  TestValidator.predicate(
    "appeal_status should be a non-empty string",
    typeof appealDetail.appeal_status === "string" &&
      appealDetail.appeal_status.length > 0,
  );
}
