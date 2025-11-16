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
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";

export async function test_api_comment_report_queue_pagination_and_ordering(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user (join)
  const adminUsername = RandomGenerator.alphabets(10);
  const adminPassword = "Admin#" + RandomGenerator.alphaNumeric(10);
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert(adminJoin);

  // 2. Create and authenticate member user (join)
  const memberUsername = RandomGenerator.alphabets(10);
  const memberPassword = "Member#" + RandomGenerator.alphaNumeric(10);
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const originHref = "https://community.example.com/signup";
  const originReferrer = "https://community.example.com/landing";

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: originHref,
      referrer: originReferrer,
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert(memberJoin);

  // At this point the connection has the member's token because join set Authorization header.

  // 3. Create a community as member user
  const communitySlug = `slug-${RandomGenerator.alphaNumeric(8)}`;
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
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. Join the community as member user
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 5. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert(post);

  // 6. Create many comments on the post (e.g. 15)
  const commentCount = 15;
  const comments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const commentCreateBody = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentCreateBody,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // 7. Optionally cast votes for some comments to simulate realistic data
  const voteDirections = ["up", "down"] as const;
  for (const comment of comments.slice(0, Math.floor(commentCount / 2))) {
    const direction = RandomGenerator.pick(voteDirections);
    const voteCreateBody = {
      direction,
    } satisfies ICommunityPlatformCommentVote.ICreate;

    const vote =
      await api.functional.communityPlatform.memberUser.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: voteCreateBody,
        },
      );
    typia.assert(vote);
  }

  // 8. Create a comment report for each comment
  const reports: ICommunityPlatformCommentReport[] = [];

  for (const comment of comments) {
    const reportCreateBody = {
      comment_id: comment.id,
      reason_category: "spam",
      reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformCommentReport.ICreate;

    const report =
      await api.functional.communityPlatform.memberUser.commentReports.create(
        connection,
        {
          body: reportCreateBody,
        },
      );
    typia.assert(report);
    reports.push(report);
  }

  // 9. Switch back to admin user (use login so that we also test admin login)
  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminUsername,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/dashboard",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });
  typia.assert(adminLogin);

  // 10. Request first page of comment report queue with ordering
  const limit = 5;
  const requestPage1 = {
    page: 1,
    limit,
    status: undefined,
    severity: undefined,
    reason_category: undefined,
    reporter_memberuser_id: undefined,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: undefined,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformCommentReport.IRequest;

  const page1 =
    await api.functional.communityPlatform.adminUser.reports.queues.comment.index(
      connection,
      {
        body: requestPage1,
      },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // Basic pagination assertions
  TestValidator.equals("page1 current page is 1", pagination1.current, 1);
  TestValidator.equals(
    "page1 limit equals requested limit",
    pagination1.limit,
    limit,
  );

  TestValidator.predicate(
    "total records should be at least number of created reports",
    pagination1.records >= reports.length,
  );

  TestValidator.predicate(
    "data length on first page should be <= limit and > 0",
    data1.length > 0 && data1.length <= limit,
  );

  // Ordering assertion on page 1 (created_at desc)
  for (let i = 1; i < data1.length; i++) {
    const prev = data1[i - 1];
    const curr = data1[i];
    TestValidator.predicate(
      `page1 ordering by created_at desc between index ${i - 1} and ${i}`,
      prev.created_at >= curr.created_at,
    );
  }

  // 11. Request second page with same ordering
  const requestPage2 = {
    page: 2,
    limit,
    status: undefined,
    severity: undefined,
    reason_category: undefined,
    reporter_memberuser_id: undefined,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: undefined,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformCommentReport.IRequest;

  const page2 =
    await api.functional.communityPlatform.adminUser.reports.queues.comment.index(
      connection,
      {
        body: requestPage2,
      },
    );
  typia.assert(page2);

  const pagination2 = page2.pagination;
  const data2 = page2.data;

  TestValidator.equals("page2 current page is 2", pagination2.current, 2);
  TestValidator.equals(
    "page2 limit equals requested limit",
    pagination2.limit,
    limit,
  );

  TestValidator.equals(
    "pagination records consistent between page1 and page2",
    pagination2.records,
    pagination1.records,
  );
  TestValidator.equals(
    "pagination pages consistent between page1 and page2",
    pagination2.pages,
    pagination1.pages,
  );

  // Page 2 may be empty if there are fewer reports than 6-10, but IDs must not overlap when it has data.
  const idsPage1 = data1.map((r) => r.id);
  const idsPage2 = data2.map((r) => r.id);

  if (idsPage2.length > 0) {
    TestValidator.predicate(
      "page1 and page2 IDs are non-overlapping",
      !idsPage2.some((id) => idsPage1.includes(id)),
    );

    for (let i = 1; i < data2.length; i++) {
      const prev = data2[i - 1];
      const curr = data2[i];
      TestValidator.predicate(
        `page2 ordering by created_at desc between index ${i - 1} and ${i}`,
        prev.created_at >= curr.created_at,
      );
    }
  }

  // 12. Optionally request a page beyond the last page
  const beyondLastPageIndex = pagination1.pages + 1;
  const requestBeyond = {
    page: beyondLastPageIndex,
    limit,
    status: undefined,
    severity: undefined,
    reason_category: undefined,
    reporter_memberuser_id: undefined,
    assigned_adminuser_id: undefined,
    moderation_case_id: undefined,
    comment_id: undefined,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformCommentReport.IRequest;

  const pageBeyond =
    await api.functional.communityPlatform.adminUser.reports.queues.comment.index(
      connection,
      {
        body: requestBeyond,
      },
    );
  typia.assert(pageBeyond);

  TestValidator.equals(
    "beyond-last-page pagination records stable",
    pageBeyond.pagination.records,
    pagination1.records,
  );
  TestValidator.equals(
    "beyond-last-page pagination pages stable",
    pageBeyond.pagination.pages,
    pagination1.pages,
  );

  TestValidator.predicate(
    "beyond-last-page data empty or at least not more than limit",
    pageBeyond.data.length === 0 ||
      (pageBeyond.data.length > 0 && pageBeyond.data.length <= limit),
  );
}
