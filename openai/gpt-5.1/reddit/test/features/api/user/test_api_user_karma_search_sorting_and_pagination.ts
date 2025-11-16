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

export async function test_api_user_karma_search_sorting_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register three member users A, B, C
  const memberJoinHref = "https://community.test/join" as const;
  const memberJoinReferrer = "https://community.test/landing" as const;

  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  const memberCJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberC: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberCJoinBody,
    });
  typia.assert(memberC);

  // 2. As Member A, create a community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberA.email,
      password: memberAJoinBody.password,
      ip: null,
      href: "https://community.test/login",
      referrer: "https://community.test/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. As Member A, create a post and comment, then generate strong karma using voters
  const postABody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postABody,
    });
  typia.assert(postA);

  const commentABody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;
  const commentA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id,
        body: commentABody,
      },
    );
  typia.assert(commentA);

  // Create voter members V1, V2, V3
  const createVoter = async () => {
    const joinBody = {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: memberJoinHref,
      referrer: memberJoinReferrer,
    } satisfies ICommunityPlatformMemberuser.IJoin;
    const authorized = await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
    typia.assert(authorized);
    return {
      joinBody,
      authorized,
    };
  };

  const voter1 = await createVoter();
  const voter2 = await createVoter();
  const voter3 = await createVoter();

  const upVotePostAs = async (voter: {
    joinBody: ICommunityPlatformMemberuser.IJoin;
    authorized: ICommunityPlatformMemberuser.IAuthorized;
  }) => {
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: voter.authorized.email,
        password: voter.joinBody.password,
        ip: null,
        href: "https://community.test/login",
        referrer: "https://community.test/post",
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });

    const voteBody = {
      direction: "up",
    } satisfies ICommunityPlatformPostVote.ICreate;
    const postVote: ICommunityPlatformPostVote =
      await api.functional.communityPlatform.memberUser.posts.votes.create(
        connection,
        {
          postId: postA.id,
          body: voteBody,
        },
      );
    typia.assert(postVote);
  };

  const upVoteCommentAs = async (voter: {
    joinBody: ICommunityPlatformMemberuser.IJoin;
    authorized: ICommunityPlatformMemberuser.IAuthorized;
  }) => {
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: voter.authorized.email,
        password: voter.joinBody.password,
        ip: null,
        href: "https://community.test/login",
        referrer: "https://community.test/comment",
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });

    const voteBody = {
      direction: "up",
    } satisfies ICommunityPlatformCommentVote.ICreate;
    const commentVote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.comments.votes.create(
        connection,
        {
          commentId: commentA.id,
          body: voteBody,
        },
      );
    typia.assert(commentVote);
  };

  // A strong karma: three post upvotes and two comment upvotes
  await upVotePostAs(voter1);
  await upVotePostAs(voter2);
  await upVotePostAs(voter3);
  await upVoteCommentAs(voter1);
  await upVoteCommentAs(voter2);

  // 4. Member B: moderate karma
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberB.email,
      password: memberBJoinBody.password,
      ip: null,
      href: "https://community.test/login",
      referrer: "https://community.test/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const postBBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBBody,
    });
  typia.assert(postB);

  const commentBBody = {
    content: RandomGenerator.paragraph({ sentences: 1 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;
  const commentB: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postB.id,
        body: commentBBody,
      },
    );
  typia.assert(commentB);

  // Use voter1 to upvote B's post and comment once each
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: voter1.authorized.email,
      password: voter1.joinBody.password,
      ip: null,
      href: "https://community.test/login",
      referrer: "https://community.test/postB",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });
  const votePostBBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const votePostB: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: postB.id,
        body: votePostBBody,
      },
    );
  typia.assert(votePostB);

  const voteCommentBBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const voteCommentB: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentB.id,
        body: voteCommentBBody,
      },
    );
  typia.assert(voteCommentB);

  // Member C: no posts/comments, stays low karma

  // 6. Create and login admin user
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: admin.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://community.test/admin/login",
      referrer: "https://community.test/admin",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });

  // 8. Call userKarmas.index sorted by totalKarma desc, page 1 with large limit
  const page1Limit = 10;
  const karmaRequestPage1 = {
    page: 1,
    limit: page1Limit,
    sortBy: "totalKarma",
    sortDirection: "desc",
  } satisfies ICommunityPlatformUserKarma.IRequest;
  const page1: IPageICommunityPlatformUserKarma.ISummary =
    await api.functional.communityPlatform.adminUser.userKarmas.index(
      connection,
      {
        body: karmaRequestPage1,
      },
    );
  typia.assert(page1);

  const summariesPage1 = page1.data;

  const findByMemberId = (
    memberId: string,
  ): ICommunityPlatformUserKarma.ISummary | undefined =>
    summariesPage1.find((s) => s.memberuser.id === memberId);

  const karmaA = findByMemberId(memberA.id);
  const karmaB = findByMemberId(memberB.id);
  const karmaC = findByMemberId(memberC.id);

  // Validate that at least A and B have entries; C may or may not depending on aggregation rules
  TestValidator.predicate(
    "member A karma summary should exist in page1",
    karmaA !== undefined,
  );
  TestValidator.predicate(
    "member B karma summary should exist in page1",
    karmaB !== undefined,
  );

  if (karmaA !== undefined && karmaB !== undefined) {
    const sumATotal = karmaA.post_karma + karmaA.comment_karma;
    const sumBTotal = karmaB.post_karma + karmaB.comment_karma;

    TestValidator.equals(
      "total_karma equals post_karma + comment_karma for A",
      sumATotal,
      karmaA.total_karma,
    );
    TestValidator.equals(
      "total_karma equals post_karma + comment_karma for B",
      sumBTotal,
      karmaB.total_karma,
    );

    TestValidator.predicate(
      "member A should have higher total_karma than member B",
      karmaA.total_karma > karmaB.total_karma,
    );

    if (karmaC !== undefined) {
      TestValidator.predicate(
        "member B should have total_karma >= member C",
        karmaB.total_karma >= karmaC.total_karma,
      );
    }

    const indexA = summariesPage1.findIndex(
      (s) => s.memberuser.id === memberA.id,
    );
    const indexB = summariesPage1.findIndex(
      (s) => s.memberuser.id === memberB.id,
    );
    if (indexA !== -1 && indexB !== -1) {
      TestValidator.predicate(
        "member A appears before member B in sorted data",
        indexA < indexB,
      );
    }
  }

  // 11. Validate pagination metadata
  TestValidator.equals(
    "pagination.current should match requested page 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should match requested limit",
    page1.pagination.limit,
    page1Limit,
  );
  TestValidator.predicate(
    "pagination.records should be >= data length",
    page1.pagination.records >= summariesPage1.length,
  );
  const expectedMinPages = Math.ceil(
    page1.pagination.records /
      (page1.pagination.limit === 0 ? 1 : page1.pagination.limit),
  );
  TestValidator.predicate(
    "pagination.pages should be >= ceil(records/limit)",
    page1.pagination.pages >= expectedMinPages,
  );

  // 10. Pagination behavior with smaller limit: page 1 and 2
  const smallLimit = 1;
  const karmaRequestSmallPage1 = {
    page: 1,
    limit: smallLimit,
    sortBy: "totalKarma",
    sortDirection: "desc",
  } satisfies ICommunityPlatformUserKarma.IRequest;
  const smallPage1: IPageICommunityPlatformUserKarma.ISummary =
    await api.functional.communityPlatform.adminUser.userKarmas.index(
      connection,
      {
        body: karmaRequestSmallPage1,
      },
    );
  typia.assert(smallPage1);

  const karmaRequestSmallPage2 = {
    page: 2,
    limit: smallLimit,
    sortBy: "totalKarma",
    sortDirection: "desc",
  } satisfies ICommunityPlatformUserKarma.IRequest;
  const smallPage2: IPageICommunityPlatformUserKarma.ISummary =
    await api.functional.communityPlatform.adminUser.userKarmas.index(
      connection,
      {
        body: karmaRequestSmallPage2,
      },
    );
  typia.assert(smallPage2);

  const topPage1 = smallPage1.data[0];
  const topPage2 = smallPage2.data[0];

  if (topPage1 !== undefined && topPage2 !== undefined) {
    TestValidator.predicate(
      "top user on page 1 should differ from top user on page 2 for small limit",
      topPage1.id !== topPage2.id,
    );
  }

  TestValidator.equals(
    "smallPage1 pagination.current should be 1",
    smallPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "smallPage2 pagination.current should be 2",
    smallPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "smallPage1 pagination.limit should match smallLimit",
    smallPage1.pagination.limit,
    smallLimit,
  );
  TestValidator.equals(
    "smallPage2 pagination.limit should match smallLimit",
    smallPage2.pagination.limit,
    smallLimit,
  );
}
