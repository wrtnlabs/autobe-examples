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

export async function test_api_comment_report_detail_includes_moderation_context_fields(
  connection: api.IConnection,
) {
  // 1. Register member user (reporter and community/post/comment author)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create community as that member
  const communityCreateBody = {
    slug: `test-community-${RandomGenerator.alphaNumeric(8)}`,
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Join the community
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

  // 4. Create a post
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 6. Create a comment report as the same member
  const reasonCategory = "harassment";
  const reasonDetail = RandomGenerator.paragraph({ sentences: 4 });

  const commentReportCreateBody = {
    comment_id: comment.id,
    reason_category: reasonCategory,
    reason_detail: reasonDetail,
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const createdReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      { body: commentReportCreateBody },
    );
  typia.assert(createdReport);

  // Basic sanity checks on created report
  TestValidator.equals(
    "created report links to correct comment",
    createdReport.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "created report has reporterMember set",
    createdReport.reporterMember?.id ?? null,
    memberAuthorized.id,
  );

  // 7. Register an admin user and authenticate as admin
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 8. Admin fetches the detailed comment report
  const detail: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.adminUser.commentReports.at(
      connection,
      { commentReportId: createdReport.id },
    );
  typia.assert(detail);

  // ID consistency
  TestValidator.equals(
    "detail.id matches created report id",
    detail.id,
    createdReport.id,
  );

  // Comment linkage
  TestValidator.equals(
    "detail.comment.id matches original comment id",
    detail.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "detail.comment.post.id matches post id",
    detail.comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "detail.comment.post.community.id matches community id",
    detail.comment.post.community.id,
    community.id,
  );
  TestValidator.equals(
    "detail.comment.author.id matches member id",
    detail.comment.author.id,
    memberAuthorized.id,
  );

  // Reporter context
  TestValidator.predicate(
    "reporterMember is non-null",
    detail.reporterMember !== null && detail.reporterMember !== undefined,
  );
  TestValidator.equals(
    "reporterMember.id matches member id",
    detail.reporterMember!.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "reporterAdmin is null for member-originated report",
    detail.reporterAdmin ?? null,
    null,
  );

  // Assigned admin - ensure field exists and is either null or a valid summary
  if (detail.assignedAdmin != null) {
    TestValidator.predicate(
      "assignedAdmin.id is non-empty uuid-like string",
      typeof detail.assignedAdmin.id === "string" &&
        detail.assignedAdmin.id.length > 0,
    );
  }

  // Moderation case linkage - nullable
  if (detail.moderationCase != null) {
    TestValidator.predicate(
      "moderationCase.id is non-empty uuid-like string",
      typeof detail.moderationCase.id === "string" &&
        detail.moderationCase.id.length > 0,
    );
  }

  // Reason fields
  TestValidator.equals(
    "reason_category matches creation payload",
    detail.reason_category,
    reasonCategory,
  );
  TestValidator.equals(
    "reason_detail matches creation payload",
    detail.reason_detail ?? null,
    reasonDetail,
  );

  // Status and severity should be non-empty strings
  TestValidator.predicate(
    "status is non-empty string",
    typeof detail.status === "string" && detail.status.length > 0,
  );
  TestValidator.predicate(
    "severity is non-empty string",
    typeof detail.severity === "string" && detail.severity.length > 0,
  );

  // Timestamp ordering and formats (typia already checked formats)
  const createdAt = new Date(detail.created_at).getTime();
  const updatedAt = new Date(detail.updated_at).getTime();

  TestValidator.predicate(
    "created_at is not after updated_at",
    !Number.isNaN(createdAt) &&
      !Number.isNaN(updatedAt) &&
      createdAt <= updatedAt,
  );

  if (detail.deleted_at != null) {
    const deletedAt = new Date(detail.deleted_at).getTime();
    TestValidator.predicate(
      "deleted_at is valid date-time when present",
      !Number.isNaN(deletedAt),
    );
  }
}
