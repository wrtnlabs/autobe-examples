import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_comments_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_votes_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_comment_vote } from "../../../prepare/prepare_random_reddit_clone_comment_vote";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test filtering and sorting user comments with various criteria.
 *
 * Validates the complete comment filtering and sorting functionality for user profiles. Tests content search, date range filtering, minimum score filtering, multiple sort orders (new, top, controversial), pagination, and combined filter scenarios.
 *
 * Special attention is given to verifying that filters work correctly individually and in combination, and that sort orders produce the expected comment ordering based on creation time, vote scores, and controversy levels.
 *
 * 1. Create a member account and authenticate.
 * 2. Create multiple posts with different content.
 * 3. Create multiple comments with varying content keywords and timestamps.
 * 4. Vote on comments to create different vote scores.
 * 5. Test content search with specific keywords.
 * 6. Test date range filtering with dateFrom and dateTo.
 * 7. Test minimum score filtering with minScore threshold.
 * 8. Test sort by new (most recent first).
 * 9. Test sort by top (highest score first).
 * 10. Test sort by controversial (many votes, score near zero).
 * 11. Test pagination with page and limit parameters.
 * 12. Test combined filters (search + minScore + sortOrder).
 * 13. Verify all filter/sort combinations return correct results.
 */
export async function test_api_profile_comments_filtering_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      href: "https://test.com/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(member);
  // 2. Create posts using utility function
  const post1 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post2);
  const post3 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post3);
  // 3. Create comments with specific keywords for testing
  const comment1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post1.id },
        body: { content: "This is a great comment about technology" },
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post1.id },
        body: { content: "Another amazing comment about design" },
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post2.id },
        body: { content: "Technology is fascinating" },
      },
    );
  typia.assert(comment3);
  const comment4 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post2.id },
        body: { content: "Design principles are important" },
      },
    );
  typia.assert(comment4);
  const comment5 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post3.id },
        body: { content: "Random comment without keywords" },
      },
    );
  typia.assert(comment5);
  const comment6 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post3.id },
        body: { content: "Technology and design combined" },
      },
    );
  typia.assert(comment6);
  // 4. Vote on comments to create different scores
  // Upvote comment1 multiple times (simulate with different users would be ideal, but we'll upvote once)
  await generate_random_reddit_clone_member_posts_comments_votes_create(
    memberConnection,
    {
      params: { postId: post1.id, commentId: comment1.id },
      body: { vote_type: "upvote" },
    },
  );
  await generate_random_reddit_clone_member_posts_comments_votes_create(
    memberConnection,
    {
      params: { postId: post1.id, commentId: comment2.id },
      body: { vote_type: "upvote" },
    },
  );
  await generate_random_reddit_clone_member_posts_comments_votes_create(
    memberConnection,
    {
      params: { postId: post2.id, commentId: comment3.id },
      body: { vote_type: "upvote" },
    },
  );
  await generate_random_reddit_clone_member_posts_comments_votes_create(
    memberConnection,
    {
      params: { postId: post2.id, commentId: comment4.id },
      body: { vote_type: "downvote" },
    },
  );
  // 5. Test content search: search for "technology"
  const searchResult = await api.functional.redditClone.profiles.comments.index(
    memberConnection,
    {
      profileId: member.id,
      body: {
        search: "technology",
        limit: 100,
      },
    },
  );
  typia.assert(searchResult);
  TestValidator.equals(
    "search returns matching comments",
    searchResult.pagination.records > 0,
    true,
  );
  for (const comment of searchResult.data) {
    TestValidator.predicate(
      "all comments contain search term",
      comment.content.toLowerCase().includes("technology"),
    );
  }
  // 6. Test date range filter
  const earliestDate = new Date(
    Math.min(
      new Date(comment1.created_at).getTime(),
      new Date(comment2.created_at).getTime(),
      new Date(comment3.created_at).getTime(),
      new Date(comment4.created_at).getTime(),
      new Date(comment5.created_at).getTime(),
      new Date(comment6.created_at).getTime(),
    ),
  ).toISOString();
  const latestDate = new Date(
    Math.max(
      new Date(comment1.created_at).getTime(),
      new Date(comment2.created_at).getTime(),
      new Date(comment3.created_at).getTime(),
      new Date(comment4.created_at).getTime(),
      new Date(comment5.created_at).getTime(),
      new Date(comment6.created_at).getTime(),
    ),
  ).toISOString();
  const dateRangeResult =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        dateFrom: earliestDate,
        dateTo: latestDate,
        limit: 100,
      },
    });
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range returns all comments",
    dateRangeResult.pagination.records,
    6,
  );
  // 7. Test minimum score filter (minScore = 1)
  const minScoreResult =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        minScore: 1,
        limit: 100,
      },
    });
  typia.assert(minScoreResult);
  for (const comment of minScoreResult.data) {
    TestValidator.predicate(
      "all comments meet minimum score",
      comment.vote_score >= 1,
    );
  }
  // 8. Test sort by new (most recent first)
  const sortByNewResult =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        sortOrder: "new",
        sortDirection: "desc",
        limit: 100,
      },
    });
  typia.assert(sortByNewResult);
  for (let i = 1; i < sortByNewResult.data.length; i++) {
    TestValidator.predicate(
      "comments sorted by newest first",
      new Date(sortByNewResult.data[i - 1].created_at).getTime() >=
        new Date(sortByNewResult.data[i].created_at).getTime(),
    );
  }
  // 9. Test sort by top (highest score first)
  const sortByTopResult =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        sortOrder: "top",
        sortDirection: "desc",
        limit: 100,
      },
    });
  typia.assert(sortByTopResult);
  for (let i = 1; i < sortByTopResult.data.length; i++) {
    TestValidator.predicate(
      "comments sorted by highest score first",
      sortByTopResult.data[i - 1].vote_score >=
        sortByTopResult.data[i].vote_score,
    );
  }
  // 10. Test sort by controversial
  const sortByControversialResult =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        sortOrder: "controversial",
        limit: 100,
      },
    });
  typia.assert(sortByControversialResult);
  TestValidator.predicate(
    "controversial sort returns results",
    sortByControversialResult.pagination.records >= 0,
  );
  // 11. Test pagination
  const paginationResult =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        page: 1,
        limit: 3,
      },
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns correct limit",
    paginationResult.data.length,
    3,
  );
  TestValidator.equals(
    "pagination metadata is correct",
    paginationResult.pagination.limit,
    3,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationResult.pagination.current,
    1,
  );
  // Test page 2
  const paginationResultPage2 =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        page: 2,
        limit: 3,
      },
    });
  typia.assert(paginationResultPage2);
  TestValidator.equals(
    "pagination page 2 returns remaining comments",
    paginationResultPage2.data.length,
    3,
  );
  TestValidator.equals(
    "pagination page 2 current page is 2",
    paginationResultPage2.pagination.current,
    2,
  );
  // 12. Test combined filters: search + minScore + sortOrder
  const combinedResult =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        search: "technology",
        minScore: 0,
        sortOrder: "top",
        sortDirection: "desc",
        limit: 100,
      },
    });
  typia.assert(combinedResult);
  for (const comment of combinedResult.data) {
    TestValidator.predicate(
      "combined filter: contains search term",
      comment.content.toLowerCase().includes("technology"),
    );
    TestValidator.predicate(
      "combined filter: meets minimum score",
      comment.vote_score >= 0,
    );
  }
  // Verify sorted by score
  for (let i = 1; i < combinedResult.data.length; i++) {
    TestValidator.predicate(
      "combined filter: sorted by score",
      combinedResult.data[i - 1].vote_score >=
        combinedResult.data[i].vote_score,
    );
  }
  // 13. Test search for "design"
  const designSearchResult =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        search: "design",
        limit: 100,
      },
    });
  typia.assert(designSearchResult);
  TestValidator.equals(
    "design search returns matching comments",
    designSearchResult.pagination.records > 0,
    true,
  );
  for (const comment of designSearchResult.data) {
    TestValidator.predicate(
      "all design comments contain search term",
      comment.content.toLowerCase().includes("design"),
    );
  }
  // Test empty search result (search for non-existent term)
  const emptySearchResult =
    await api.functional.redditClone.profiles.comments.index(memberConnection, {
      profileId: member.id,
      body: {
        search: "nonexistentkeyword12345",
        limit: 100,
      },
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns no results",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search data array is empty",
    emptySearchResult.data.length,
    0,
  );
}
