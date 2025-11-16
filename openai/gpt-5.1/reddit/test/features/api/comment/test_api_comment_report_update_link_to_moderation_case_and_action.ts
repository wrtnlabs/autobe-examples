import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that an admin user can process a member-created comment report by
 * linking it to a moderation case and moderation action, while enforcing
 * role-based access for the update endpoint.
 *
 * Business flow covered:
 *
 * 1. Member joins the platform and becomes authenticated.
 * 2. Member creates a community.
 * 3. Member joins the community (membership established).
 * 4. Member creates a post in that community.
 * 5. Member comments on that post.
 * 6. Member reports the comment, creating a comment report.
 * 7. Admin joins (registers) and becomes authenticated.
 * 8. Admin creates a moderation case.
 * 9. Admin creates an account restriction episode (linked generically to
 *    account_type="memberUser").
 * 10. Admin creates a moderation action header linked to the case and restriction.
 * 11. Admin updates the original comment report: assigns themself, links the
 *     moderation case, and adjusts status/severity and reason_detail.
 * 12. Validate the updated report’s key fields and that immutable relationships
 *     (reporter, comment, reason_category, created_at) remain unchanged.
 * 13. Validate that a member (non-admin) cannot call the admin update endpoint by
 *     expecting an error when attempting the same update as the member.
 */
export async function test_api_comment_report_update_link_to_moderation_case_and_action(
  connection: api.IConnection,
) {
  // 1. Member joins and authenticates
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member creates a community
  const communitySlug = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Member joins the community (membership)
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 4. Member creates a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Member creates a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. Member reports the comment
  const commentReportCreateBody = {
    comment_id: comment.id,
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const originalReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: commentReportCreateBody,
      },
    );
  typia.assert(originalReport);

  // Capture immutable fields for later comparison
  const originalReporterMemberId = originalReport.reporterMember?.id ?? null;
  const originalCommentId = originalReport.comment.id;
  const originalReasonCategory = originalReport.reason_category;
  const originalCreatedAt = originalReport.created_at;

  // 7. Admin joins (register & authenticate)
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 8. Admin creates a moderation case
  const moderationCaseCreateBody = {
    case_key: `CASE-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: moderationCaseCreateBody },
    );
  typia.assert(moderationCase);

  // 9. Admin creates an account restriction episode (generic memberUser scope)
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const accountRestrictionCreateBody = {
    account_type: "memberUser",
    scope: "commenting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const accountRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: accountRestrictionCreateBody },
    );
  typia.assert(accountRestriction);

  // 10. Admin creates a moderation action header linked to case + restriction
  const moderationActionCreateBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: accountRestriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: moderationActionCreateBody },
    );
  typia.assert(moderationAction);

  // 11. Admin updates the comment report with workflow fields + case link
  const updatedStatus = "in_review";
  const updatedSeverity = "high";
  const updatedReasonDetail = RandomGenerator.paragraph({ sentences: 3 });

  const reportUpdateBody = {
    status: updatedStatus,
    severity: updatedSeverity,
    assigned_adminuser_id: adminAuthorized.id,
    reason_detail: updatedReasonDetail,
    moderation_case_id: moderationCase.id,
  } satisfies ICommunityPlatformCommentReport.IUpdate;

  const updatedReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.adminUser.commentReports.update(
      connection,
      {
        commentReportId: originalReport.id,
        body: reportUpdateBody,
      },
    );
  typia.assert(updatedReport);

  // 12–13. Validate update results and immutability of key relationships
  // Validate status and severity
  TestValidator.equals(
    "comment report status should be updated",
    updatedReport.status,
    updatedStatus,
  );
  TestValidator.equals(
    "comment report severity should be updated",
    updatedReport.severity,
    updatedSeverity,
  );

  // Validate assigned admin summary
  TestValidator.predicate(
    "assignedAdmin must be present after update",
    updatedReport.assignedAdmin !== undefined &&
      updatedReport.assignedAdmin !== null,
  );

  if (
    updatedReport.assignedAdmin !== undefined &&
    updatedReport.assignedAdmin !== null
  ) {
    TestValidator.equals(
      "assignedAdmin id should match acting admin",
      updatedReport.assignedAdmin.id,
      adminAuthorized.id,
    );
  }

  // Validate moderationCase summary linkage
  TestValidator.predicate(
    "moderationCase must be present after linking",
    updatedReport.moderationCase !== undefined &&
      updatedReport.moderationCase !== null,
  );

  if (
    updatedReport.moderationCase !== undefined &&
    updatedReport.moderationCase !== null
  ) {
    TestValidator.equals(
      "linked moderationCase id should match created moderation case",
      updatedReport.moderationCase.id,
      moderationCase.id,
    );
  }

  // Immutable fields: comment reference id must remain same
  TestValidator.equals(
    "comment reference on report should remain unchanged",
    updatedReport.comment.id,
    originalCommentId,
  );

  // Immutable: reporter member id must remain unchanged
  TestValidator.equals(
    "reporter member id should remain unchanged",
    updatedReport.reporterMember?.id ?? null,
    originalReporterMemberId,
  );

  // Immutable: reason_category should not change
  TestValidator.equals(
    "reason_category should remain unchanged after update",
    updatedReport.reason_category,
    originalReasonCategory,
  );

  // Immutable-ish: created_at should be unchanged
  TestValidator.equals(
    "created_at should remain the same after update",
    updatedReport.created_at,
    originalCreatedAt,
  );

  // 14. Unauthorized path: member tries to call admin update endpoint
  // Re-authenticate as the original member to ensure member token is active.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  await TestValidator.error(
    "member user should not be allowed to update admin comment report",
    async () => {
      const memberAttemptBody = {
        status: "resolved",
        severity: "low",
        assigned_adminuser_id: null,
        moderation_case_id: null,
      } satisfies ICommunityPlatformCommentReport.IUpdate;

      await api.functional.communityPlatform.adminUser.commentReports.update(
        connection,
        {
          commentReportId: originalReport.id,
          body: memberAttemptBody,
        },
      );
    },
  );
}
