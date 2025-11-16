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

export async function test_api_comment_report_update_rejects_non_admin_caller(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser who will own the content
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. As memberUser, create a community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Member joins the community (membership)
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Member creates a post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Member creates a comment under that post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 6. Member creates a comment report for that comment
  const commentReportCreateBody = {
    comment_id: comment.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const commentReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: commentReportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommentReport>(commentReport);

  // Snapshot original state fields we care about for later comparison
  const originalReportId = commentReport.id;
  const originalStatus: string = commentReport.status;
  const originalSeverity: string = commentReport.severity;
  const originalAssignedAdmin = commentReport.assignedAdmin ?? null;
  const originalModerationCase = commentReport.moderationCase ?? null;

  // 7. Prepare an admin-only style update body as the memberUser
  const memberUpdateBody = {
    status: "resolved",
    severity: "high",
    assigned_adminuser_id: null,
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    moderation_case_id: null,
  } satisfies ICommunityPlatformCommentReport.IUpdate;

  // 8. While still authenticated as memberUser, attempt the admin-only update
  await TestValidator.error(
    "memberUser cannot update comment report via adminUser endpoint",
    async () => {
      await api.functional.communityPlatform.adminUser.commentReports.update(
        connection,
        {
          commentReportId: originalReportId,
          body: memberUpdateBody,
        },
      );
    },
  );

  // 9. Create and authenticate an adminUser
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(10)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Optionally perform an explicit admin login to demonstrate actor switching
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoggedIn);

  // 10. As adminUser, perform a legitimate update on the same report
  const adminUpdateBody = {
    status: originalStatus,
    severity: originalSeverity,
    assigned_adminuser_id: adminAuthorized.id,
    reason_detail: commentReport.reason_detail,
    moderation_case_id: originalModerationCase?.id ?? null,
  } satisfies ICommunityPlatformCommentReport.IUpdate;

  const updatedByAdmin: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.adminUser.commentReports.update(
      connection,
      {
        commentReportId: originalReportId,
        body: adminUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformCommentReport>(updatedByAdmin);

  // 11. Validate that the admin update succeeded and that the report we updated
  // is the same one originally created
  TestValidator.equals(
    "admin update should target the original comment report id",
    updatedByAdmin.id,
    originalReportId,
  );

  TestValidator.equals(
    "admin update should set severity to expected value",
    updatedByAdmin.severity,
    adminUpdateBody.severity,
  );

  TestValidator.equals(
    "admin update should set status to expected value",
    updatedByAdmin.status,
    adminUpdateBody.status,
  );

  TestValidator.predicate(
    "assignedAdmin after admin update should not be null",
    updatedByAdmin.assignedAdmin !== null &&
      updatedByAdmin.assignedAdmin !== undefined,
  );
}
