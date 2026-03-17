import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

/**
 * E2E test for member comments filtering functionality.
 * Tests filtering by authorId, postId, voteScoreMin/voteScoreMax,
 * afterDate/beforeDate, pagination, and sorting.
 */
export async function test_api_member_comments_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate two member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member1Auth!);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member2Auth!);
  // 2. Create multiple test posts by Member 1
  const posts: IRedditCommunityPost[] = [];
  const postIds: string[] = [];
  // Create 5 posts
  for (let i = 0; i < 5; i++) {
    const post = await generate_random_reddit_community_member_posts_create(
      member1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
          post_type: "text" as const,
          body: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          community_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post!);
    posts.push(post);
    postIds.push(post.id);
  }
  // 3. Create top-level comments by Member 1
  const member1Comments: IRedditCommunityComment[] = [];
  for (let i = 0; i < 10; i++) {
    const postIndex = i % postIds.length;
    const comment =
      await generate_random_reddit_community_member_posts_comments_create(
        member1Connection,
        {
          body: {
            body: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 4,
              wordMax: 8,
            }),
            parent_comment_id: null,
          } satisfies IRedditCommunityComment.ICreate,
          params: { postId: postIds[postIndex] },
        },
      );
    typia.assert(comment!);
    member1Comments.push(comment);
  }
  // 4. Create reply comments by Member 2 (nested structure)
  const member2Replies: IRedditCommunityComment[] = [];
  const topCommentForReply = member1Comments[0];
  for (let i = 0; i < 3; i++) {
    const reply =
      await generate_random_reddit_community_member_posts_comments_create(
        member2Connection,
        {
          body: {
            body: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 6,
            }),
            parent_comment_id: topCommentForReply.id,
          } satisfies IRedditCommunityComment.ICreate,
          params: { postId: postIds[0] },
        },
      );
    typia.assert(reply!);
    member2Replies.push(reply);
  }
  // 5. Test filtering by authorId (Member 1's comments)
  const member1Id = member1Comments[0]?.author.id;
  TestValidator.predicate(
    "member1 comments have author",
    member1Id !== undefined,
  );
  if (member1Id) {
    const member1FilterResult =
      await api.functional.redditCommunity.member.users.comments.index(
        member1Connection,
        {
          userId: member1Id,
          body: {
            authorId: member1Id,
            limit: 50,
          } satisfies IRedditCommunityComment.IRequest,
        },
      );
    typia.assert(member1FilterResult!);
    TestValidator.equals(
      "member1 filter returns author's comments",
      member1FilterResult.data.length > 0,
      true,
    );
    for (const comment of member1FilterResult.data) {
      TestValidator.equals(
        `comment author matches filter`,
        comment.author.id,
        member1Id,
      );
    }
  }
  // 6. Test filtering by authorId (Member 2's comments)
  const member2Id = member2Replies[0]?.author.id;
  TestValidator.predicate(
    "member2 comments have author",
    member2Id !== undefined,
  );
  if (member2Id) {
    const member2FilterResult =
      await api.functional.redditCommunity.member.users.comments.index(
        member2Connection,
        {
          userId: member2Id,
          body: {
            authorId: member2Id,
            limit: 50,
          } satisfies IRedditCommunityComment.IRequest,
        },
      );
    typia.assert(member2FilterResult!);
    TestValidator.equals(
      "member2 filter returns author's comments",
      member2FilterResult.data.length > 0,
      true,
    );
    for (const comment of member2FilterResult.data) {
      TestValidator.equals(
        `member2 comment author matches filter`,
        comment.author.id,
        member2Id,
      );
    }
  }
  // 7. Test filtering by postId
  const testPostId = postIds[0];
  const postIdFilterResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          postId: testPostId,
          limit: 50,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(postIdFilterResult!);
  TestValidator.equals(
    "postId filter returns comments from specific post",
    postIdFilterResult.data.length > 0,
    true,
  );
  // Note: ISummary doesn't include post information, so we verify by filtering criteria
  // 8. Test filtering by voteScoreMin/voteScoreMax
  const positiveScoreFilterResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          voteScoreMin: 1,
          limit: 50,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(positiveScoreFilterResult!);
  for (const comment of positiveScoreFilterResult.data) {
    TestValidator.predicate(
      `positive score filter comments have score >= 1`,
      comment.voteScore >= 1,
    );
  }
  const negativeScoreFilterResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          voteScoreMax: -1,
          limit: 50,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(negativeScoreFilterResult!);
  for (const comment of negativeScoreFilterResult.data) {
    TestValidator.predicate(
      `negative score filter comments have score <= -1`,
      comment.voteScore <= -1,
    );
  }
  const zeroScoreFilterResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          voteScoreMin: 0,
          voteScoreMax: 0,
          limit: 50,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(zeroScoreFilterResult!);
  for (const comment of zeroScoreFilterResult.data) {
    TestValidator.equals(
      `zero score filter comments have score == 0`,
      comment.voteScore,
      0,
    );
  }
  // 9. Test filtering by afterDate/beforeDate
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 5);
  const afterDateFilterResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          afterDate: cutoffDate.toISOString(),
          limit: 50,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(afterDateFilterResult!);
  for (const comment of afterDateFilterResult.data) {
    TestValidator.predicate(
      `afterDate filter comments created after cutoff`,
      new Date(comment.createdAt) > cutoffDate,
    );
  }
  const beforeDateFilterResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          beforeDate: cutoffDate.toISOString(),
          limit: 50,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(beforeDateFilterResult!);
  for (const comment of beforeDateFilterResult.data) {
    TestValidator.predicate(
      `beforeDate filter comments created before cutoff`,
      new Date(comment.createdAt) < cutoffDate,
    );
  }
  // 10. Test combined filters
  const combinedFilterResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          authorId: member1Id ?? member1Comments[0]?.author.id ?? "",
          postId: postIds[0],
          voteScoreMin: 0,
          limit: 50,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(combinedFilterResult!);
  for (const comment of combinedFilterResult.data) {
    TestValidator.equals(
      `combined filter authorId`,
      comment.author.id,
      member1Id ?? member1Comments[0]?.author.id ?? "",
    );
    // Note: ISummary doesn't include post information, skipping post verification
    TestValidator.predicate(
      `combined filter vote score`,
      comment.voteScore >= 0,
    );
  }
  // 11. Test pagination with filters
  const paginationResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          authorId: member1Id ?? member1Comments[0]?.author.id ?? "",
          page: 2,
          limit: 3,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(paginationResult!);
  TestValidator.equals(
    `pagination page`,
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    `pagination limit`,
    paginationResult.pagination.limit,
    3,
  );
  TestValidator.equals(
    `pagination has data`,
    paginationResult.data.length > 0,
    true,
  );
  // 12. Test sorting with filters
  const sortNewResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          sort: "new" as const,
          limit: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(sortNewResult!);
  const sortBestResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          sort: "best" as const,
          limit: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(sortBestResult!);
  const sortControversialResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          sort: "controversial" as const,
          limit: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(sortControversialResult!);
  // 13. Test edge case: empty results with filter
  const emptyFilterResult =
    await api.functional.redditCommunity.member.users.comments.index(
      member1Connection,
      {
        userId: member1Id ?? member1Comments[0]?.author.id ?? "",
        body: {
          authorId: member1Id ?? member1Comments[0]?.author.id ?? "",
          postId: typia.random<string & tags.Format<"uuid">>(),
          limit: 50,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(emptyFilterResult!);
  TestValidator.equals(
    "empty filter returns no results",
    emptyFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter pagination records",
    emptyFilterResult.pagination.records,
    0,
  );
}
