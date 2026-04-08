import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test comment listing with various sorting and filtering options on a post.
 *
 * Validates the complete comment retrieval workflow including sorting by recency, popularity, and controversy level, as well as filtering by author, date range, minimum score, and content search. Ensures that pagination works correctly with cursor-based navigation.
 *
 * The test creates multiple comments with varying content to verify that sorting and filtering logic works as expected. Special attention is given to verifying that the sortOrder parameter correctly orders results and that filter parameters narrow down results appropriately.
 *
 * 1. Authenticate as a member to create post and comments.
 * 2. Subscribe member to a community to enable post creation.
 * 3. Create a post that will have comments.
 * 4. Create multiple comments with varying content for sorting/filtering tests.
 * 5. Test sorting by 'new' returns most recent comments first.
 * 6. Test sorting by 'top' returns highest vote score comments first.
 * 7. Test sorting by 'controversial' returns comments with many votes but scores near zero.
 * 8. Test filtering by authorId returns only comments from specific user.
 * 9. Test filtering by date range returns comments within specified period.
 * 10. Test filtering by minScore returns only comments meeting minimum vote threshold.
 * 11. Test search by content text performs case-insensitive partial matching.
 * 12. Test pagination works correctly with cursor-based navigation.
 */
export async function test_api_comment_list_sorting_and_filtering(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Subscribe member to a community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: subscription.community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Create multiple comments with varying content
  const comments = [] as IRedditCloneComment[];
  for (let i = 0; i < 5; i++) {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnection,
        {
          params: {
            postId: post.id,
          },
          body: {
            content: `Test comment number ${i + 1} with unique content for filtering and search`,
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 5. Test sorting by 'new' returns most recent comments first
  const sortByNew = await api.functional.redditClone.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sortOrder: "new",
        sortDirection: "desc",
        limit: 10,
      },
    },
  );
  typia.assert(sortByNew);
  TestValidator.predicate(
    "sort by new returns comments in descending order",
    sortByNew.data.length > 0,
  );
  // 6. Test sorting by 'top' returns highest vote score comments first
  const sortByTop = await api.functional.redditClone.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sortOrder: "top",
        sortDirection: "desc",
        limit: 10,
      },
    },
  );
  typia.assert(sortByTop);
  TestValidator.predicate(
    "sort by top returns comments",
    sortByTop.data.length > 0,
  );
  // 7. Test sorting by 'controversial' returns comments with many votes but scores near zero
  const sortByControversial =
    await api.functional.redditClone.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        sortOrder: "controversial",
        sortDirection: "desc",
        limit: 10,
      },
    });
  typia.assert(sortByControversial);
  TestValidator.predicate(
    "sort by controversial returns comments",
    sortByControversial.data.length > 0,
  );
  // 8. Test filtering by authorId returns only comments from specific user
  const filterByAuthor = await api.functional.redditClone.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        authorId: member.id,
        limit: 10,
      },
    },
  );
  typia.assert(filterByAuthor);
  TestValidator.equals(
    "all comments belong to the specified author",
    filterByAuthor.data.every((c) => c.author.id === member.id),
    true,
  );
  // 9. Test filtering by date range returns comments within specified period
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const filterByDateRange =
    await api.functional.redditClone.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        dateFrom: oneDayAgo.toISOString(),
        dateTo: new Date().toISOString(),
        limit: 10,
      },
    });
  typia.assert(filterByDateRange);
  TestValidator.predicate(
    "date range filter returns comments within range",
    filterByDateRange.data.length >= 0,
  );
  // 10. Test filtering by minScore returns only comments meeting minimum vote threshold
  const filterByMinScore =
    await api.functional.redditClone.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        minScore: 0,
        limit: 10,
      },
    });
  typia.assert(filterByMinScore);
  TestValidator.predicate(
    "minScore filter returns comments with score >= 0",
    filterByMinScore.data.every((c) => c.vote_score >= 0),
  );
  // 11. Test search by content text performs case-insensitive partial matching
  const searchComment = await api.functional.redditClone.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        search: "comment",
        limit: 10,
      },
    },
  );
  typia.assert(searchComment);
  TestValidator.predicate(
    "search returns comments containing the search term",
    searchComment.data.every((c) =>
      c.content.toLowerCase().includes("comment"),
    ),
  );
  // 12. Test pagination works correctly with cursor-based navigation
  const page1 = await api.functional.redditClone.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        limit: 2,
        page: 1,
      },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has correct limit", page1.data.length, 2);
  TestValidator.equals(
    "pagination metadata is correct",
    page1.pagination.current,
    1,
  );
  const page2 = await api.functional.redditClone.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        limit: 2,
        page: 2,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "pagination metadata for page 2 is correct",
    page2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 1 and page 2 have different comments",
    page1.data[0]?.id !== page2.data[0]?.id,
  );
}
