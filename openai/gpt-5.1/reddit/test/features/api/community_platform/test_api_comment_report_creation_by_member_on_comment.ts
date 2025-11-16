import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_comment_report_creation_by_member_on_comment(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 2. Create a community
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
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
      { body: communityBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community slug should match input",
    community.slug,
    communityBody.slug,
  );

  // 3. Join the community as a member
  const membershipBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership community id should match community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member id should be the joined member",
    membership.memberUser.id,
    memberId,
  );

  // 4. Create a post in the community
  const postBody = {
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
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id should match community",
    post.community_id,
    community.id,
  );

  // 5. Create a comment under the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "comment post id should match post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment author id should be the joined member",
    comment.author.id,
    memberId,
  );

  // 6. Create a comment report for the comment
  const reasonCategory = RandomGenerator.pick([
    "spam",
    "harassment",
    "hate",
    "sexual",
    "self_harm",
    "illegal",
    "other",
  ] as const);

  const reasonDetail = RandomGenerator.paragraph({ sentences: 3 });

  const reportBody = {
    comment_id: comment.id,
    reason_category: reasonCategory,
    reason_detail: reasonDetail,
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const report: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  // Validate core associations
  TestValidator.equals(
    "report id should be a UUID string",
    report.id,
    report.id,
  );

  TestValidator.equals(
    "reported comment id should match original comment",
    report.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "reported comment post id should match original post",
    report.comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "reported comment community id should match original community",
    report.comment.post.community.id,
    community.id,
  );
  TestValidator.equals(
    "reported comment community slug should match original community",
    report.comment.post.community.slug,
    community.slug,
  );

  // Reporter expectations
  TestValidator.predicate(
    "reporterMember should be populated",
    report.reporterMember !== null && report.reporterMember !== undefined,
  );
  if (report.reporterMember !== null && report.reporterMember !== undefined) {
    TestValidator.equals(
      "reporterMember id should match member user id",
      report.reporterMember.id,
      memberId,
    );
  }

  TestValidator.equals(
    "reporterAdmin should be null for member-created report",
    report.reporterAdmin,
    null,
  );

  // Reason fields
  TestValidator.equals(
    "reason_category should echo request",
    report.reason_category,
    reportBody.reason_category,
  );
  TestValidator.equals(
    "reason_detail should echo request",
    report.reason_detail,
    reportBody.reason_detail,
  );

  // Status and severity are non-empty strings
  TestValidator.predicate(
    "status should be non-empty string",
    typeof report.status === "string" && report.status.length > 0,
  );
  TestValidator.predicate(
    "severity should be non-empty string",
    typeof report.severity === "string" && report.severity.length > 0,
  );

  // created_at and updated_at must be valid and equal on initial creation
  TestValidator.predicate(
    "created_at should be non-empty string",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be non-empty string",
    typeof report.updated_at === "string" && report.updated_at.length > 0,
  );
  TestValidator.equals(
    "created_at and updated_at should be equal immediately after creation",
    report.created_at,
    report.updated_at,
  );
}
