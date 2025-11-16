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
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserKarma";

export async function test_api_user_karma_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register Member A (memberUser join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Member A creates a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10),
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

  // 3. Member A creates a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Member A upvotes the post
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

  // 5. Member A creates a comment on the post
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

  // 6. Member A upvotes the comment
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

  // 7. Register and authenticate an adminUser
  const adminPassword = "AdminPass123!";

  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Explicit login step to exercise login flow and ensure admin context
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 8. Admin searches user karmas with basic pagination and minTotalKarma filter
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const searchBody = {
    page,
    limit,
    sortBy: "totalKarma",
    sortDirection: "desc",
    minTotalKarma: 0 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformUserKarma.IRequest;

  const pageResult: IPageICommunityPlatformUserKarma.ISummary =
    await api.functional.communityPlatform.adminUser.userKarmas.index(
      connection,
      { body: searchBody },
    );
  typia.assert(pageResult);

  // Validate pagination metadata
  const pagination: IPage.IPagination = pageResult.pagination;
  TestValidator.equals(
    "pagination current matches requested page",
    pagination.current,
    searchBody.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    pagination.limit,
    searchBody.limit ?? limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );

  // Find Member A's karma record in the result, if present
  const memberKarma: ICommunityPlatformUserKarma.ISummary | undefined =
    pageResult.data.find((item) => item.memberuser.id === memberId);

  TestValidator.predicate(
    "Member A should appear in user karma search with minTotalKarma = 0",
    memberKarma !== undefined,
  );

  if (memberKarma !== undefined) {
    // Validate positivity of individual karma components
    TestValidator.predicate(
      "Member A post_karma is positive after upvoting a post",
      memberKarma.post_karma > 0,
    );
    TestValidator.predicate(
      "Member A comment_karma is positive after upvoting a comment",
      memberKarma.comment_karma > 0,
    );

    // Validate aggregation rule: total_karma = post_karma + comment_karma
    TestValidator.equals(
      "Member A total_karma equals sum of post_karma and comment_karma",
      memberKarma.total_karma,
      (memberKarma.post_karma + memberKarma.comment_karma) as number &
        tags.Type<"int32">,
    );

    // 9. Search again with a high minTotalKarma to exclude Member A
    const highMinTotalKarma = (memberKarma.total_karma + 1000) as number &
      tags.Type<"int32">;

    const restrictiveSearchBody = {
      page,
      limit,
      sortBy: "totalKarma",
      sortDirection: "desc",
      minTotalKarma: highMinTotalKarma,
    } satisfies ICommunityPlatformUserKarma.IRequest;

    const restrictiveResult: IPageICommunityPlatformUserKarma.ISummary =
      await api.functional.communityPlatform.adminUser.userKarmas.index(
        connection,
        { body: restrictiveSearchBody },
      );
    typia.assert(restrictiveResult);

    const memberKarmaHighFilter = restrictiveResult.data.find(
      (item) => item.memberuser.id === memberId,
    );

    TestValidator.predicate(
      "Member A should not appear when minTotalKarma is higher than their total_karma",
      memberKarmaHighFilter === undefined,
    );
  }
}
