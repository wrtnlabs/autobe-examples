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

export async function test_api_comment_report_detail_view_by_admin_after_member_report(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (memberUser join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the member
  const communitySlug = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community slug matches request",
    community.slug,
    communitySlug,
  );

  // 3. Join the created community as a member
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

  TestValidator.equals(
    "membership community slug matches community",
    membership.community.slug,
    community.slug,
  );

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post.community_id equals created community.id",
    post.community_id,
    community.id,
  );

  // 5. Create a comment under the post
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

  TestValidator.equals(
    "comment.post.id equals created post.id",
    comment.post.id,
    post.id,
  );

  // 6. Create a comment report for that comment as the member
  const reasonCategory = "harassment";
  const reportCreateBody = {
    comment_id: comment.id,
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const createdReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  TestValidator.equals(
    "created report targets the correct comment",
    createdReport.comment.id,
    comment.id,
  );

  // 7. Register and authenticate an admin user
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 8. As admin, fetch the comment report detail by id
  const fetchedReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.adminUser.commentReports.at(
      connection,
      {
        commentReportId: createdReport.id,
      },
    );
  typia.assert(fetchedReport);

  // Core assertions about fetched report
  TestValidator.equals(
    "fetched report id matches path id",
    fetchedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "fetched report comment.id matches original comment.id",
    fetchedReport.comment.id,
    comment.id,
  );

  TestValidator.equals(
    "fetched report comment.post.id matches original post.id",
    fetchedReport.comment.post.id,
    post.id,
  );

  TestValidator.equals(
    "fetched report reason_category matches created",
    fetchedReport.reason_category,
    reasonCategory,
  );

  // Reporter expectations: member reporter populated, admin reporter null
  TestValidator.predicate(
    "reporterMember is populated for member-submitted report",
    fetchedReport.reporterMember !== undefined &&
      fetchedReport.reporterMember !== null,
  );

  TestValidator.predicate(
    "reporterAdmin is null for member-submitted report",
    fetchedReport.reporterAdmin === undefined ||
      fetchedReport.reporterAdmin === null,
  );

  // Status and severity should be non-empty strings
  TestValidator.predicate(
    "status is a non-empty string",
    typeof fetchedReport.status === "string" &&
      fetchedReport.status.trim().length > 0,
  );

  TestValidator.predicate(
    "severity is a non-empty string",
    typeof fetchedReport.severity === "string" &&
      fetchedReport.severity.trim().length > 0,
  );

  // created_at and updated_at temporal relationship: created_at <= updated_at
  const createdAt = new Date(fetchedReport.created_at).getTime();
  const updatedAt = new Date(fetchedReport.updated_at).getTime();

  TestValidator.predicate(
    "created_at is not after updated_at",
    !Number.isNaN(createdAt) &&
      !Number.isNaN(updatedAt) &&
      createdAt <= updatedAt,
  );
}
