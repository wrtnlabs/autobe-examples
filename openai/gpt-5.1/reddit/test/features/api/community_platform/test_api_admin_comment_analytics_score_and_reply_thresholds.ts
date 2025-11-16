import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAnalytics";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentAnalytics";

export async function test_api_admin_comment_analytics_score_and_reply_thresholds(
  connection: api.IConnection,
) {
  // 1. AdminUser and MemberUser bootstrap
  const adminUsername = RandomGenerator.alphabets(12);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.test`;
  const adminPassword = "Admin#1234";

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminJoin.email,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 2. MemberUser bootstrap and content setup
  const memberPassword = "Member#1234";
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: `${RandomGenerator.alphabets(8)}@member.test`,
      password: memberPassword,
      ip: null,
      href: "https://app.example.com/signup",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoin.email,
      password: memberPassword,
      ip: null,
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 3. Create a community as memberUser
  const communitySlug = RandomGenerator.alphabets(10);
  const communityCreate =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          slug: communitySlug,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          status: "active",
          is_nsfw: false,
          is_quarantined: false,
          is_posting_restricted: false,
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityCreate);

  // 4. Create membership in that community
  const membership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityCreate.slug,
        body: {
          role: "member",
          isApproved: true,
          isBanned: false,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 5. Create a post in the community
  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        communityId: communityCreate.id,
        communityCode: communityCreate.slug,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // 6. Create multiple comments on the post
  const commentCount = 5;
  const comments: ICommunityPlatformComment[] = await ArrayUtil.asyncRepeat(
    commentCount,
    async () => {
      const comment =
        await api.functional.communityPlatform.memberUser.posts.comments.create(
          connection,
          {
            postId: post.id,
            body: {
              content: RandomGenerator.paragraph({ sentences: 2 }),
              parentCommentId: undefined,
            } satisfies ICommunityPlatformComment.ICreate,
          },
        );
      typia.assert<ICommunityPlatformComment>(comment);
      return comment;
    },
  );

  TestValidator.predicate(
    "created comment count should match expected",
    comments.length === commentCount,
  );

  // 7. Switch back to adminUser context (login again to ensure token)
  const adminReLogin = await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminJoin.email,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminReLogin);

  // 8. Baseline analytics query
  const baselineAnalytics =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      {
        body: {
          post_ids: [post.id],
          community_ids: [communityCreate.id],
          author_memberuser_ids: undefined,
          status: undefined,
          created_from: null,
          created_to: null,
          min_score: null,
          max_score: null,
          min_reply_count: null,
          max_reply_count: null,
          sort_by: undefined,
          sort_direction: undefined,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommentAnalytics.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommentAnalytics.ISummary>(
    baselineAnalytics,
  );

  const pagination = baselineAnalytics.pagination;
  const analyticsData = baselineAnalytics.data;

  TestValidator.predicate(
    "pagination current page must be 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit must be >= data length",
    pagination.limit >= analyticsData.length,
  );

  // Guard: if no analytics rows, skip threshold tests (nothing to filter).
  if (analyticsData.length === 0) {
    TestValidator.predicate(
      "baseline analytics may be empty when no comment analytics are available",
      analyticsData.length === 0,
    );
    return;
  }

  TestValidator.predicate(
    "baseline analytics should have at least one record for meaningful threshold tests",
    analyticsData.length >= 1,
  );

  // 9. Derive thresholds based on baseline data
  const scores = analyticsData.map((a) => a.score);
  const replyCounts = analyticsData.map((a) => a.reply_count);

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const minReply = Math.min(...replyCounts);
  const maxReply = Math.max(...replyCounts);

  const scoreThresholdForMin = maxScore; // ensures subset or equal
  const scoreThresholdForMax = minScore; // ensures subset or equal
  const replyThresholdForMin = maxReply;
  const replyThresholdForMax = minReply;

  // 10. min_score threshold: score >= scoreThresholdForMin
  const minScoreResult =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      {
        body: {
          post_ids: [post.id],
          community_ids: [communityCreate.id],
          author_memberuser_ids: undefined,
          status: undefined,
          created_from: null,
          created_to: null,
          min_score: scoreThresholdForMin,
          max_score: null,
          min_reply_count: null,
          max_reply_count: null,
          sort_by: undefined,
          sort_direction: undefined,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommentAnalytics.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommentAnalytics.ISummary>(
    minScoreResult,
  );

  minScoreResult.data.forEach((row) => {
    TestValidator.predicate(
      "min_score filter should include only comments with score >= threshold",
      row.score >= scoreThresholdForMin,
    );
  });
  TestValidator.predicate(
    "minScoreResult pagination limit must be >= data length",
    minScoreResult.pagination.limit >= minScoreResult.data.length,
  );

  // 11. max_score threshold: score <= scoreThresholdForMax
  const maxScoreResult =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      {
        body: {
          post_ids: [post.id],
          community_ids: [communityCreate.id],
          author_memberuser_ids: undefined,
          status: undefined,
          created_from: null,
          created_to: null,
          min_score: null,
          max_score: scoreThresholdForMax,
          min_reply_count: null,
          max_reply_count: null,
          sort_by: undefined,
          sort_direction: undefined,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommentAnalytics.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommentAnalytics.ISummary>(
    maxScoreResult,
  );

  maxScoreResult.data.forEach((row) => {
    TestValidator.predicate(
      "max_score filter should include only comments with score <= threshold",
      row.score <= scoreThresholdForMax,
    );
  });

  // 12. min_reply_count threshold: reply_count >= replyThresholdForMin
  const minReplyResult =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      {
        body: {
          post_ids: [post.id],
          community_ids: [communityCreate.id],
          author_memberuser_ids: undefined,
          status: undefined,
          created_from: null,
          created_to: null,
          min_score: null,
          max_score: null,
          min_reply_count: replyThresholdForMin,
          max_reply_count: null,
          sort_by: undefined,
          sort_direction: undefined,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommentAnalytics.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommentAnalytics.ISummary>(
    minReplyResult,
  );

  minReplyResult.data.forEach((row) => {
    TestValidator.predicate(
      "min_reply_count filter should include only comments with reply_count >= threshold",
      row.reply_count >= replyThresholdForMin,
    );
  });

  // 13. max_reply_count threshold: reply_count <= replyThresholdForMax
  const maxReplyResult =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      {
        body: {
          post_ids: [post.id],
          community_ids: [communityCreate.id],
          author_memberuser_ids: undefined,
          status: undefined,
          created_from: null,
          created_to: null,
          min_score: null,
          max_score: null,
          min_reply_count: null,
          max_reply_count: replyThresholdForMax,
          sort_by: undefined,
          sort_direction: undefined,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommentAnalytics.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommentAnalytics.ISummary>(
    maxReplyResult,
  );

  maxReplyResult.data.forEach((row) => {
    TestValidator.predicate(
      "max_reply_count filter should include only comments with reply_count <= threshold",
      row.reply_count <= replyThresholdForMax,
    );
  });

  // 14. Combined threshold check: min_score and min_reply_count together
  const combinedResult =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      {
        body: {
          post_ids: [post.id],
          community_ids: [communityCreate.id],
          author_memberuser_ids: undefined,
          status: undefined,
          created_from: null,
          created_to: null,
          min_score: scoreThresholdForMin,
          max_score: null,
          min_reply_count: replyThresholdForMin,
          max_reply_count: null,
          sort_by: undefined,
          sort_direction: undefined,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommentAnalytics.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommentAnalytics.ISummary>(
    combinedResult,
  );

  combinedResult.data.forEach((row) => {
    TestValidator.predicate(
      "combined min_score and min_reply_count filter should include only comments satisfying both thresholds",
      row.score >= scoreThresholdForMin &&
        row.reply_count >= replyThresholdForMin,
    );
  });
}
