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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";

export async function test_api_comment_report_search_requires_admin_role(
  connection: api.IConnection,
) {
  // 1. Register memberUser and obtain member session
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/register",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 2. As memberUser, create a community
  const communityBody = {
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
      { body: communityBody },
    );
  typia.assert(community);

  // Join the community as member
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
  typia.assert(membership);

  // 3. Create a post in the community
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

  // Create a comment under the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(comment);

  // File a comment report as the same memberUser
  const reportCreateBody = {
    comment_id: comment.id,
    reason_category: "spam",
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

  // 4. Attempt to search comment reports as memberUser (should fail)
  const memberSearchRequest = {
    page: 1,
    limit: 10,
    status: undefined,
    severity: undefined,
    reason_category: undefined,
    reporter_memberuser_id: memberUser.id,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: comment.id,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ICommunityPlatformCommentReport.IRequest;

  await TestValidator.error(
    "memberUser cannot search comment reports via admin endpoint",
    async () => {
      await api.functional.communityPlatform.adminUser.commentReports.index(
        connection,
        { body: memberSearchRequest },
      );
    },
  );

  // 5. Register adminUser and let SDK attach admin token
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminUser: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminUser);

  // 6. As adminUser, perform the same search and expect success
  const adminSearchRequest = {
    page: 1,
    limit: 10,
    status: undefined,
    severity: undefined,
    reason_category: undefined,
    reporter_memberuser_id: memberUser.id,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: comment.id,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ICommunityPlatformCommentReport.IRequest;

  const pageResult: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.adminUser.commentReports.index(
      connection,
      { body: adminSearchRequest },
    );
  typia.assert(pageResult);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "pagination limit should be non-negative",
    pageResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pageResult.pagination.records >= 0,
  );

  // Ensure at least one report matches our created report context when any data exists
  if (pageResult.pagination.records > 0 && pageResult.data.length > 0) {
    const matched = pageResult.data.some((summary) => {
      return (
        summary.comment.id === comment.id &&
        summary.comment.post.id === post.id &&
        summary.comment.post.community.id === community.id &&
        summary.reporter.id === memberUser.id
      );
    });

    TestValidator.predicate(
      "admin search should be able to retrieve the created comment report",
      matched,
    );
  }
}
