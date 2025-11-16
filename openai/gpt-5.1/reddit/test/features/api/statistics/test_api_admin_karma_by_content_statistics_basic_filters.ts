import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformKarmaByContentStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByContentStatistics";
import type { ICommunityPlatformKarmaByContentStatisticsTopComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByContentStatisticsTopComment";
import type { ICommunityPlatformKarmaByContentStatisticsTopPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByContentStatisticsTopPost";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaByContentStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaByContentStatistics";

export async function test_api_admin_karma_by_content_statistics_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and keep credentials in variables for later login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminJoinRequest = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminJoin);

  // 2. Register a memberUser who will create content and vote
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const memberJoinRequest = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberJoin);

  // 3. As memberUser, create a community
  const communitySlug: string = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.name(2) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 4. As memberUser, create a membership in that community
  const membershipCreateBody = {
    role: "member",
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

  // 5. As memberUser, create a post in the community
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

  // 6. As memberUser, create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 7. As same memberUser, cast votes on post and comment
  const postVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postVoteBody,
      },
    );
  typia.assert(postVote);

  const commentVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: commentVoteBody,
      },
    );
  typia.assert(commentVote);

  // 8. Re-authenticate as adminUser to ensure admin context
  const adminLoginRequest = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.community.example.com/login",
    referrer: "https://admin.community.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminLogin);

  // 9. Call karma-by-content statistics with minimal filters
  const statsRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "score" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformKarmaByContentStatistics.IRequest;

  const statsPage: IPageICommunityPlatformKarmaByContentStatistics.ISummary =
    await api.functional.communityPlatform.adminUser.statistics.karma.byContent.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(statsPage);

  const pagination: IPage.IPagination = statsPage.pagination;
  const rows: ICommunityPlatformKarmaByContentStatistics.ISummary[] =
    statsPage.data;

  // 10. Basic pagination assertions
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    statsRequestBody.limit,
  );
  TestValidator.predicate(
    "records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be at least 1 when limit > 0",
    pagination.pages >= 1,
  );
  TestValidator.predicate(
    "records should be >= data length",
    pagination.records >= rows.length,
  );

  // 11. Assert we have at least some data rows
  TestValidator.predicate(
    "karma-by-content statistics should return at least one row when content exists",
    rows.length >= 1,
  );

  if (rows.length > 0) {
    const first: ICommunityPlatformKarmaByContentStatistics.ISummary = rows[0];
    TestValidator.predicate(
      "totalContents should be non-negative",
      first.totalContents >= 0,
    );
    TestValidator.predicate(
      "totalPostKarma should be non-negative",
      first.totalPostKarma >= 0,
    );
    TestValidator.predicate(
      "totalCommentKarma should be non-negative",
      first.totalCommentKarma >= 0,
    );
    TestValidator.predicate(
      "averageKarmaPerContent should be non-negative",
      first.averageKarmaPerContent >= 0,
    );
    TestValidator.predicate(
      "medianKarmaPerContent should be non-negative",
      first.medianKarmaPerContent >= 0,
    );

    // Validate top posts/comment entries if present
    if (first.topPosts.length > 0) {
      const topPost: ICommunityPlatformKarmaByContentStatisticsTopPost.ISummary =
        first.topPosts[0];
      TestValidator.predicate(
        "top post totalKarma should be non-negative",
        topPost.totalKarma >= 0,
      );
      TestValidator.predicate(
        "top post rank should be at least 1",
        topPost.rank >= 1,
      );
    }

    if (first.topComments.length > 0) {
      const topComment: ICommunityPlatformKarmaByContentStatisticsTopComment.ISummary =
        first.topComments[0];
      TestValidator.predicate(
        "top comment totalKarma should be non-negative",
        topComment.totalKarma >= 0,
      );
      TestValidator.predicate(
        "top comment rank should be at least 1",
        topComment.rank >= 1,
      );
    }
  }
}
