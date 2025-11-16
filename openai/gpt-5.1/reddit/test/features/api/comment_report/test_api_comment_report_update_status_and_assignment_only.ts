import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate admin workflow-only updates on comment reports.
 *
 * Business flow:
 *
 * 1. Member joins and becomes authenticated.
 * 2. Member creates a community.
 * 3. Member joins that community.
 * 4. Member creates a post in that community.
 * 5. Member creates a comment on that post.
 * 6. Member creates a comment report referencing that comment.
 * 7. Admin joins (authentication for adminUser actor).
 * 8. Admin updates the report via PUT
 *    /communityPlatform/adminUser/commentReports/{commentReportId} changing
 *    only status, severity, assigned_adminuser_id and reason_detail.
 * 9. Verify mutable fields change while immutable references (id, comment,
 *    reporter*, reason_category, created_at) remain stable and assignedAdmin is
 *    populated.
 * 10. Perform a second update transitioning status again and verify updated_at
 *     advances while created_at stays unchanged.
 */
export async function test_api_comment_report_update_status_and_assignment_only(
  connection: api.IConnection,
) {
  // 1. Member joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 2. Member creates a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Member joins the community
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

  // 4. Member creates a post
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Member creates a comment on that post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
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

  // 6. Member creates a comment report
  const reportCreateBody = {
    comment_id: comment.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const initialReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(initialReport);

  // Snapshot immutable references before admin updates
  const initialId = initialReport.id;
  const initialCommentSummary = initialReport.comment;
  const initialReporterMember = initialReport.reporterMember ?? null;
  const initialReporterAdmin = initialReport.reporterAdmin ?? null;
  const initialReasonCategory = initialReport.reason_category;
  const initialCreatedAt = initialReport.created_at;

  // 7. Admin joins (acts as adminUser actor)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 8. Admin updates the comment report (status, severity, assignment, reason_detail)
  const firstUpdateBody = {
    status: "in_review",
    severity: "high",
    assigned_adminuser_id: admin.id,
    reason_detail: "Normalized internal note for review.",
  } satisfies ICommunityPlatformCommentReport.IUpdate;

  const updatedOnce: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.adminUser.commentReports.update(
      connection,
      {
        commentReportId: initialReport.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedOnce);

  // Assertions for first update
  TestValidator.equals(
    "status should be updated to in_review",
    updatedOnce.status,
    "in_review",
  );
  TestValidator.equals(
    "severity should be updated to high",
    updatedOnce.severity,
    "high",
  );
  TestValidator.predicate(
    "assignedAdmin summary should be populated with acting admin",
    !!updatedOnce.assignedAdmin && updatedOnce.assignedAdmin.id === admin.id,
  );
  TestValidator.equals(
    "reason_detail should be updated to normalized note",
    updatedOnce.reason_detail ?? null,
    "Normalized internal note for review.",
  );

  // Immutable field checks after first update
  TestValidator.equals(
    "report id must remain unchanged",
    updatedOnce.id,
    initialId,
  );
  TestValidator.equals(
    "comment summary must remain unchanged",
    updatedOnce.comment,
    initialCommentSummary,
  );
  TestValidator.equals(
    "reporterMember must remain unchanged",
    updatedOnce.reporterMember ?? null,
    initialReporterMember,
  );
  TestValidator.equals(
    "reporterAdmin must remain unchanged",
    updatedOnce.reporterAdmin ?? null,
    initialReporterAdmin,
  );
  TestValidator.equals(
    "reason_category must remain unchanged",
    updatedOnce.reason_category,
    initialReasonCategory,
  );
  TestValidator.equals(
    "created_at must remain unchanged after first update",
    updatedOnce.created_at,
    initialCreatedAt,
  );

  const updatedOnceUpdatedAt = updatedOnce.updated_at;

  // 9. Second update: transition status to resolved and change severity again
  const secondUpdateBody = {
    status: "resolved",
    severity: "medium",
    assigned_adminuser_id: admin.id,
    reason_detail: "Resolved after manual review.",
  } satisfies ICommunityPlatformCommentReport.IUpdate;

  const updatedTwice: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.adminUser.commentReports.update(
      connection,
      {
        commentReportId: initialReport.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedTwice);

  TestValidator.equals(
    "status should transition to resolved",
    updatedTwice.status,
    "resolved",
  );
  TestValidator.equals(
    "severity should be updated to medium",
    updatedTwice.severity,
    "medium",
  );
  TestValidator.equals(
    "reason_detail should reflect resolution note",
    updatedTwice.reason_detail ?? null,
    "Resolved after manual review.",
  );

  // Verify timestamps: created_at unchanged, updated_at advanced
  TestValidator.equals(
    "created_at remains unchanged after second update",
    updatedTwice.created_at,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should advance after second update",
    updatedTwice.updated_at !== updatedOnceUpdatedAt,
  );
}
