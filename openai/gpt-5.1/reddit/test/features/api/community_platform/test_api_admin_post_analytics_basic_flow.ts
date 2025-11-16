import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAnalytics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostAnalytics";

/**
 * Validate that an admin user can retrieve post analytics for a community with
 * existing posts and that the analytics data and sorting behave as expected.
 *
 * Business flow:
 *
 * 1. Create a memberUser and an adminUser via their join endpoints.
 * 2. As the memberUser, create a community.
 * 3. As the memberUser, create at least one post in that community.
 * 4. As the adminUser, call the admin analytics endpoint filtered by that
 *    community and with score-desc sorting.
 * 5. Validate pagination metadata, ensure at least one analytics record for our
 *    post/community exists, and verify basic metric sanity and sort order.
 */
export async function test_api_admin_post_analytics_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register memberUser (auto-authenticated by SDK)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 2. Register adminUser (auto-authenticated by SDK)
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminUser: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminUser);

  // 3. Switch to memberUser explicitly via login to ensure correct actor
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 4. Create a community as the memberUser
  const communityBody = {
    slug: `community-${RandomGenerator.alphabets(8)}`,
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5. Create at least one post in that community as the memberUser
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 6. Switch back to adminUser explicitly via login to ensure admin context
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 7. Call admin post analytics endpoint filtered by community
  const now = new Date();
  const createdAtFrom = new Date(now.getTime() - 1000 * 60 * 60).toISOString(); // 1 hour ago
  const createdAtTo = new Date(now.getTime() + 1000 * 60 * 60).toISOString(); // 1 hour ahead

  const analyticsRequestBody = {
    page: 1,
    pageSize: 10,
    communityId: community.id,
    authorMemberUserId: null,
    status: null,
    createdAtFrom,
    createdAtTo,
    minScore: null,
    maxScore: null,
    sortBy: "score",
    sortDirection: "desc",
  } satisfies ICommunityPlatformPostAnalytics.IRequest;

  const analyticsPage: IPageICommunityPlatformPostAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.posts.index(
      connection,
      { body: analyticsRequestBody },
    );
  typia.assert<IPageICommunityPlatformPostAnalytics.ISummary>(analyticsPage);

  // 8. Basic pagination validation
  const pagination: IPage.IPagination = analyticsPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination.current should be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records should be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    pagination.pages >= 0,
  );

  // 9. Ensure at least one analytics record exists
  TestValidator.predicate(
    "analytics data should contain at least one record",
    analyticsPage.data.length > 0,
  );

  // 10. Find analytics record for our created post/community
  const matched = analyticsPage.data.find(
    (row) => row.post_id === post.id && row.community_id === community.id,
  );

  TestValidator.predicate(
    "analytics should contain record for created post in community",
    matched !== undefined,
  );

  if (matched !== undefined) {
    // Validate numeric metrics are non-negative and types are correct
    typia.assert<ICommunityPlatformPostAnalytics.ISummary>(matched);

    TestValidator.predicate(
      "upvote_count should be >= 0",
      matched.upvote_count >= 0,
    );
    TestValidator.predicate(
      "downvote_count should be >= 0",
      matched.downvote_count >= 0,
    );
    TestValidator.predicate(
      "comment_count should be >= 0",
      matched.comment_count >= 0,
    );
    TestValidator.predicate(
      "unique_view_count should be >= 0",
      matched.unique_view_count >= 0,
    );

    // If embedded post/community summaries exist, assert their IDs match
    if (matched.post !== undefined) {
      TestValidator.equals(
        "embedded post summary id should match post.id",
        matched.post.id,
        post.id,
      );
    }
    if (matched.community !== undefined) {
      TestValidator.equals(
        "embedded community summary id should match community.id",
        matched.community.id,
        community.id,
      );
    }
  }

  // 11. Verify sort order for score when there are multiple analytics records
  if (analyticsPage.data.length >= 2) {
    const scores = analyticsPage.data.map((row) => row.score);
    for (let i = 1; i < scores.length; i++) {
      TestValidator.predicate(
        "scores should be in non-increasing order for desc sort",
        scores[i - 1] >= scores[i],
      );
    }
  }
}
