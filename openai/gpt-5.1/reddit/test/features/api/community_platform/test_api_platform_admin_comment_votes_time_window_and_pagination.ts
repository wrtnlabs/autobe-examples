import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

export async function test_api_platform_admin_comment_votes_time_window_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-auth via join)
  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // 2. As platform admin, create visibility level and post type
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphabets(8)}`,
          name: `Public ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: `text-${RandomGenerator.alphabets(8)}`,
          name: `Text ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert(postType);

  // 3. Register member user (auto-auth via join)
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(14),
        ip: "127.0.0.1",
        href: "https://app.example.com/join",
        referrer: "https://app.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // 4. As member user, create community and post
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `comm-${RandomGenerator.alphabets(8)}`,
          title: `Community ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type_id: postType.id,
        title: `Post ${RandomGenerator.name(3)}`,
        body: RandomGenerator.paragraph({ sentences: 10 }),
        url: undefined,
        image_uri: undefined,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. As member user, create a comment
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          parentCommentId: undefined,
          renderingMode: "markdown",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // Helper to sleep for ms
  const sleep = async (ms: number): Promise<void> =>
    await new Promise((resolve) => setTimeout(resolve, ms));

  // 5a. Create early votes
  const earlyVotes: ICommunityPlatformCommentVote[] = [];
  const earlyCount = 4;
  for (let i = 0; i < earlyCount; i++) {
    const vote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.commentVotes.create(
        connection,
        {
          body: {
            community_platform_comment_id: comment.id,
            vote_value: i % 2 === 0 ? 1 : -1,
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    typia.assert(vote);
    earlyVotes.push(vote);
    await sleep(20);
  }

  // small delay before late votes to ensure clear separation in created_at
  await sleep(30);

  // 5b. Create late votes
  const lateVotes: ICommunityPlatformCommentVote[] = [];
  const lateCount = 3;
  for (let i = 0; i < lateCount; i++) {
    const vote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.commentVotes.create(
        connection,
        {
          body: {
            community_platform_comment_id: comment.id,
            vote_value: i % 2 === 0 ? 1 : -1,
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    typia.assert(vote);
    lateVotes.push(vote);
    await sleep(20);
  }

  // Collect created_at times from early and late votes to build windows
  const earlyCreated = earlyVotes.map((v) => v.created_at);
  const lateCreated = lateVotes.map((v) => v.created_at);

  const sortAsc = (values: string[]): string[] =>
    [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const sortedEarly = sortAsc(earlyCreated);
  const sortedLate = sortAsc(lateCreated);

  const earlyWindowFrom = sortedEarly[0];
  const earlyWindowTo = sortedEarly[sortedEarly.length - 1];

  const lateWindowFrom = sortedLate[0];
  const lateWindowTo = sortedLate[sortedLate.length - 1];

  // 6. Platform admin is already authenticated from join, so directly query
  const pageLimit = 2;

  // 7. Query early votes with small page size
  const firstPageEarly: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.platformAdmin.commentVotes.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageLimit,
          community_platform_comment_id: comment.id,
          created_from: earlyWindowFrom,
          created_to: earlyWindowTo,
          order_by_created_at: "asc",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(firstPageEarly);

  // Validate pagination metadata for first page
  const earlyPagination: IPage.IPagination = firstPageEarly.pagination;
  typia.assert<IPage.IPagination>(earlyPagination);

  TestValidator.equals(
    "early first page current page should be 1",
    earlyPagination.current,
    1,
  );
  TestValidator.equals(
    "early first page limit matches request",
    earlyPagination.limit,
    pageLimit,
  );

  // Ensure all results are within [earlyWindowFrom, earlyWindowTo]
  for (const item of firstPageEarly.data) {
    const created = item.created_at;
    TestValidator.predicate(
      "first page early vote created_at within window",
      created >= earlyWindowFrom && created <= earlyWindowTo,
    );
    TestValidator.equals(
      "first page early vote comment id matches",
      item.comment.id,
      comment.id,
    );
  }

  // If more than one page of early votes exists, fetch second page
  if (earlyPagination.pages >= 2) {
    const secondPageEarly: IPageICommunityPlatformCommentVote.ISummary =
      await api.functional.communityPlatform.platformAdmin.commentVotes.index(
        connection,
        {
          body: {
            page: 2,
            limit: pageLimit,
            community_platform_comment_id: comment.id,
            created_from: earlyWindowFrom,
            created_to: earlyWindowTo,
            order_by_created_at: "asc",
          } satisfies ICommunityPlatformCommentVote.IRequest,
        },
      );
    typia.assert(secondPageEarly);

    const secondPagination: IPage.IPagination = secondPageEarly.pagination;
    typia.assert<IPage.IPagination>(secondPagination);

    TestValidator.equals(
      "early second page current page should be 2",
      secondPagination.current,
      2,
    );
    TestValidator.equals(
      "early second page limit matches request",
      secondPagination.limit,
      pageLimit,
    );

    for (const item of secondPageEarly.data) {
      const created = item.created_at;
      TestValidator.predicate(
        "second page early vote created_at within window",
        created >= earlyWindowFrom && created <= earlyWindowTo,
      );
      TestValidator.equals(
        "second page early vote comment id matches",
        item.comment.id,
        comment.id,
      );
    }

    // Optional: if pages > 2, fetch the last page
    if (secondPagination.pages > 2) {
      const lastPageIndex = secondPagination.pages;
      const lastPageEarly: IPageICommunityPlatformCommentVote.ISummary =
        await api.functional.communityPlatform.platformAdmin.commentVotes.index(
          connection,
          {
            body: {
              page: lastPageIndex,
              limit: pageLimit,
              community_platform_comment_id: comment.id,
              created_from: earlyWindowFrom,
              created_to: earlyWindowTo,
              order_by_created_at: "asc",
            } satisfies ICommunityPlatformCommentVote.IRequest,
          },
        );
      typia.assert(lastPageEarly);

      const lastPagination: IPage.IPagination = lastPageEarly.pagination;
      typia.assert<IPage.IPagination>(lastPagination);

      TestValidator.equals(
        "early last page index matches pagination.pages",
        lastPagination.current,
        lastPagination.pages,
      );
      TestValidator.equals(
        "early last page limit matches request",
        lastPagination.limit,
        pageLimit,
      );

      for (const item of lastPageEarly.data) {
        const created = item.created_at;
        TestValidator.predicate(
          "last page early vote created_at within window",
          created >= earlyWindowFrom && created <= earlyWindowTo,
        );
        TestValidator.equals(
          "last page early vote comment id matches",
          item.comment.id,
          comment.id,
        );
      }
    }
  }

  // 9. Repeat query for late votes time window to confirm symmetry
  const latePageLimit = 2;
  const lateFirstPage: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.platformAdmin.commentVotes.index(
      connection,
      {
        body: {
          page: 1,
          limit: latePageLimit,
          community_platform_comment_id: comment.id,
          created_from: lateWindowFrom,
          created_to: lateWindowTo,
          order_by_created_at: "asc",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(lateFirstPage);

  const latePagination: IPage.IPagination = lateFirstPage.pagination;
  typia.assert<IPage.IPagination>(latePagination);

  TestValidator.equals(
    "late first page current should be 1",
    latePagination.current,
    1,
  );
  TestValidator.equals(
    "late first page limit matches request",
    latePagination.limit,
    latePageLimit,
  );

  for (const item of lateFirstPage.data) {
    const created = item.created_at;
    TestValidator.predicate(
      "late first page vote created_at within late window",
      created >= lateWindowFrom && created <= lateWindowTo,
    );
    TestValidator.equals(
      "late first page vote comment id matches",
      item.comment.id,
      comment.id,
    );
  }
}
