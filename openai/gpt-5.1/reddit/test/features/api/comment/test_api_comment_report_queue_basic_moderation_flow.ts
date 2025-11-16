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

export async function test_api_comment_report_queue_basic_moderation_flow(
  connection: api.IConnection,
) {
  // 1. Register admin user (join) and keep credentials
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPassw0rd!";

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  // 2. Register member user (join) and keep credentials
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MemberPassw0rd!";
  const commonHref: string = typia.random<string & tags.Format<"uri">>();
  const commonReferrer: string = typia.random<string & tags.Format<"uri">>();

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: commonHref,
      referrer: commonReferrer,
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 3. Switch context to member explicitly via login (to ensure token is correct)
  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: commonHref,
      referrer: commonReferrer,
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 4. Member creates a community
  const communitySlug: string = RandomGenerator.alphabets(10);
  const communityName: string = RandomGenerator.name(2);
  const communityDescription: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          slug: communitySlug,
          name: communityName,
          description: communityDescription,
          visibility: "public",
          status: "active",
          is_nsfw: false,
          is_quarantined: false,
          is_posting_restricted: false,
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: false,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5. Member joins the community (membership create)
  const membership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          role: "member",
          isApproved: true,
          isBanned: false,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 6. Member creates a post in that community
  const postTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  const postBody: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        communityId: community.id,
        communityCode: community.slug,
        title: postTitle,
        body: postBody,
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // 7. Member creates a comment on that post
  const commentContent: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });

  const comment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: commentContent,
          parentCommentId: undefined,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 8. Member votes on that comment
  const commentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          direction: "up",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(commentVote);

  // 9. Member creates a comment report on that comment
  const reportReasonCategory: string = "harassment";
  const reportReasonDetail: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });

  const commentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: {
          comment_id: comment.id,
          reason_category: reportReasonCategory,
          reason_detail: reportReasonDetail,
        } satisfies ICommunityPlatformCommentReport.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommentReport>(commentReport);

  // 10. Re-authenticate as admin user
  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: commonHref,
      referrer: commonReferrer,
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 11. Admin fetches comment report queue with broad filter
  const page = 1;
  const limit = 10;

  const queue =
    await api.functional.communityPlatform.adminUser.reports.queues.comment.index(
      connection,
      {
        body: {
          page,
          limit,
        } satisfies ICommunityPlatformCommentReport.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommentReport.ISummary>(queue);

  // 12. Basic pagination assertions
  const pagination = queue.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "pagination current page matches request",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records should be at least 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    pagination.pages >= 1,
  );

  // 13. Ensure at least one summary corresponds to the reported comment
  const summaries = queue.data;
  TestValidator.predicate(
    "at least one comment report summary returned",
    summaries.length >= 1,
  );

  const matchingSummary = summaries.find(
    (summary) => summary.comment.id === comment.id,
  );

  TestValidator.predicate(
    "queue contains an entry for the reported comment",
    matchingSummary !== undefined,
  );

  if (!matchingSummary) return;

  // 14. Validate critical fields on the matching summary
  typia.assert<ICommunityPlatformCommentReport.ISummary>(matchingSummary);

  TestValidator.predicate(
    "summary id is non-empty",
    matchingSummary.id.length > 0,
  );
  TestValidator.predicate(
    "summary reason is non-empty",
    matchingSummary.reason.length > 0,
  );
  TestValidator.predicate(
    "summary status is non-empty",
    matchingSummary.status.length > 0,
  );
  TestValidator.predicate(
    "summary severity is non-empty",
    matchingSummary.severity.length > 0,
  );
  TestValidator.predicate(
    "summary created_at is non-empty",
    matchingSummary.created_at.length > 0,
  );
  TestValidator.predicate(
    "summary updated_at is non-empty",
    matchingSummary.updated_at.length > 0,
  );

  // Validate nested comment summary
  TestValidator.equals(
    "summary.comment.id matches reported comment id",
    matchingSummary.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "summary.comment.post.id matches original post id",
    matchingSummary.comment.post.id,
    post.id,
  );
}
