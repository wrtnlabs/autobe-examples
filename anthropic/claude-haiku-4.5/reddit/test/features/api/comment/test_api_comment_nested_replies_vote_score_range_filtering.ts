import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

export async function test_api_comment_nested_replies_vote_score_range_filtering(
  connection: api.IConnection,
) {
  // 1. Create administrator user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: `Admin ${RandomGenerator.name()}`,
        href: "https://test.example.com/admin",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Test Category ${RandomGenerator.alphaNumeric(6)}`,
          slug: `test-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: memberPassword,
        href: "https://test.example.com/join",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create root post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Test Post ${RandomGenerator.alphaNumeric(6)}`,
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Create parent comment
  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);

  // 7. Create multiple child comments (replies to parent)
  const childComments: ICommunityPlatformComment[] =
    await ArrayUtil.asyncRepeat(
      4,
      async () =>
        await api.functional.communityPlatform.member.comments.create(
          connection,
          {
            body: {
              post_id: post.id,
              parent_comment_id: parentComment.id,
              content: RandomGenerator.paragraph({ sentences: 3 }),
            } satisfies ICommunityPlatformComment.ICreate,
          },
        ),
    );
  for (const child of childComments) {
    typia.assert(child);
  }

  // 8. Test filtering with min_vote_score=50
  const resultHigh: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        min_vote_score: 50,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(resultHigh);
  TestValidator.predicate(
    "filtering with min_vote_score=50 returns properly formatted response",
    Array.isArray(resultHigh.data) && resultHigh.pagination !== undefined,
  );
  for (const comment of resultHigh.data) {
    TestValidator.predicate(
      `comment has vote_score >= 50 when min_vote_score=50 filter applied`,
      comment.vote_score >= 50,
    );
  }

  // 9. Test filtering with max_vote_score=10
  const resultLow: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        max_vote_score: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(resultLow);
  TestValidator.predicate(
    "filtering with max_vote_score=10 returns properly formatted response",
    Array.isArray(resultLow.data) && resultLow.pagination !== undefined,
  );
  for (const comment of resultLow.data) {
    TestValidator.predicate(
      `comment has vote_score <= 10 when max_vote_score=10 filter applied`,
      comment.vote_score <= 10,
    );
  }

  // 10. Test filtering with min_vote_score=10 AND max_vote_score=50
  const resultRange: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        min_vote_score: 10,
        max_vote_score: 50,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(resultRange);
  TestValidator.predicate(
    "filtering with vote score range [10, 50] returns properly formatted response",
    Array.isArray(resultRange.data) && resultRange.pagination !== undefined,
  );
  for (const comment of resultRange.data) {
    TestValidator.predicate(
      `comment vote_score in range [10, 50]`,
      comment.vote_score >= 10 && comment.vote_score <= 50,
    );
  }

  // 11. Test boundary: min_vote_score=0
  const resultMinZero: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        min_vote_score: 0,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(resultMinZero);
  TestValidator.predicate(
    "filtering with min_vote_score=0 includes non-negative vote scores",
    resultMinZero.data.every((c) => c.vote_score >= 0),
  );

  // 12. Test boundary: max_vote_score=0
  const resultMaxZero: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        max_vote_score: 0,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(resultMaxZero);
  TestValidator.predicate(
    "filtering with max_vote_score=0 returns only non-positive vote scores",
    resultMaxZero.data.every((c) => c.vote_score <= 0),
  );

  // 13. Test boundary: min_vote_score greater than all scores
  const resultAboveMax: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        min_vote_score: 10000,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(resultAboveMax);
  TestValidator.predicate(
    "filtering with min_vote_score=10000 returns empty results",
    resultAboveMax.data.length === 0,
  );

  // 14. Test boundary: max_vote_score less than minimum possible
  const resultBelowMin: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        max_vote_score: -1,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(resultBelowMin);
  TestValidator.predicate(
    "filtering with max_vote_score=-1 returns empty results",
    resultBelowMin.data.length === 0,
  );

  // 15. Test edge case: min_vote_score > max_vote_score
  const resultInverted: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        min_vote_score: 100,
        max_vote_score: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(resultInverted);
  TestValidator.predicate(
    "filtering with min > max returns empty results or handles gracefully",
    resultInverted.data.length === 0 ||
      resultInverted.data.every(
        (c) => c.vote_score >= 100 || c.vote_score <= 10,
      ),
  );

  // 16. Verify pagination metadata is valid
  const paginatedResult: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 2,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination metadata contains valid structure",
    paginatedResult.pagination.current >= 0 &&
      paginatedResult.pagination.limit > 0 &&
      paginatedResult.pagination.records >= 0 &&
      paginatedResult.pagination.pages >= 0,
  );

  // 17. Test filtering with sorting
  const sortedResult: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        min_vote_score: 0,
        sort_by: "top",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedResult);
  TestValidator.predicate(
    "vote score filtering works in combination with sorting",
    sortedResult.data.every((c) => c.vote_score >= 0),
  );

  // 18. Test all filters together with pagination
  const combinedResult: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 10,
        min_vote_score: 0,
        max_vote_score: 100,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filtering, sorting and pagination all work together",
    combinedResult.data.every(
      (c) => c.vote_score >= 0 && c.vote_score <= 100,
    ) &&
      combinedResult.pagination.current > 0 &&
      combinedResult.pagination.limit <= 10,
  );
}
