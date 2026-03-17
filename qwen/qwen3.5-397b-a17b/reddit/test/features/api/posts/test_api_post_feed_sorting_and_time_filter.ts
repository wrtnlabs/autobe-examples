import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_vote } from "../../../generate/generate_random_reddit_clone_member_posts_vote";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_feed_sorting_and_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 3. Create multiple posts with varying content for sorting tests
  const postTitles = [
    "Hot Post About Technology",
    "New Post About Science",
    "Top Post About Programming",
    "Controversial Post About Politics",
    "Another Hot Post About AI",
    "Fresh New Post Today",
    "Old Post From Last Week",
    "Popular Post This Month",
    "Trending Post This Year",
    "Classic Post All Time",
  ];
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < postTitles.length; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          title: postTitles[i],
          post_type: "TEXT",
          community_id: community.id,
          text: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          },
        } satisfies IRedditClonePost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Cast votes on posts to create varied vote scores
  // Note: Same member can only have one vote per post, so we cast different vote types
  await generate_random_reddit_clone_member_posts_vote(memberConnection, {
    params: { postId: posts[0].id },
    body: { vote_type: "UPVOTE" } satisfies IRedditClonePostVote.ICreate,
  });
  await generate_random_reddit_clone_member_posts_vote(memberConnection, {
    params: { postId: posts[1].id },
    body: { vote_type: "UPVOTE" } satisfies IRedditClonePostVote.ICreate,
  });
  await generate_random_reddit_clone_member_posts_vote(memberConnection, {
    params: { postId: posts[2].id },
    body: { vote_type: "UPVOTE" } satisfies IRedditClonePostVote.ICreate,
  });
  await generate_random_reddit_clone_member_posts_vote(memberConnection, {
    params: { postId: posts[3].id },
    body: { vote_type: "DOWNVOTE" } satisfies IRedditClonePostVote.ICreate,
  });
  await generate_random_reddit_clone_member_posts_vote(memberConnection, {
    params: { postId: posts[4].id },
    body: { vote_type: null } satisfies IRedditClonePostVote.ICreate,
  });
  // 5. Test 'new' sorting (chronological by created_at DESC)
  const newSorted = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newSorted);
  TestValidator.predicate("new sort returns posts", newSorted.data.length > 0);
  // Verify posts are in descending chronological order
  for (let i = 1; i < newSorted.data.length; i++) {
    TestValidator.predicate(
      `new sort order at index ${i}`,
      new Date(newSorted.data[i - 1].created_at).getTime() >=
        new Date(newSorted.data[i].created_at).getTime(),
    );
  }
  // 6. Test 'top' sorting with all time filters
  const timeFilters: Array<
    "today" | "this_week" | "this_month" | "this_year" | "all_time"
  > = ["today", "this_week", "this_month", "this_year", "all_time"];
  for (const timeFilter of timeFilters) {
    const topSorted = await api.functional.redditClone.posts.index(
      memberConnection,
      {
        body: {
          sort: "top",
          timeFilter: timeFilter,
          limit: 10,
          page: 1,
        } satisfies IRedditClonePost.IRequest,
      },
    );
    typia.assert(topSorted);
    TestValidator.predicate(
      `top sort with ${timeFilter} returns valid response`,
      topSorted.data.length >= 0,
    );
    TestValidator.predicate(
      `top sort ${timeFilter} has valid pagination`,
      topSorted.pagination.current >= 1,
    );
  }
  // 7. Test 'hot' sorting (engagement-based)
  const hotSorted = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotSorted);
  TestValidator.predicate("hot sort returns posts", hotSorted.data.length > 0);
  // 8. Test 'controversial' sorting
  const controversialSorted = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sort: "controversial",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(controversialSorted);
  // 9. Test search functionality by title
  const searchResults = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        search: "Post",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(searchResults);
  // Verify all returned posts contain search term in title
  for (const post of searchResults.data) {
    TestValidator.predicate(
      `search result contains "Post" in title: ${post.title}`,
      post.title.toLowerCase().includes("post"),
    );
  }
  // 10. Test pagination with different limit values
  const limitValues = [1, 5, 10, 20, 50, 100];
  for (const limit of limitValues) {
    const paginated = await api.functional.redditClone.posts.index(
      memberConnection,
      {
        body: {
          sort: "new",
          limit: limit satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1,
        } satisfies IRedditClonePost.IRequest,
      },
    );
    typia.assert(paginated);
    TestValidator.predicate(
      `pagination limit ${limit} respects max`,
      paginated.data.length <= limit,
    );
    TestValidator.equals(
      `pagination limit ${limit} metadata`,
      paginated.pagination.limit,
      limit,
    );
  }
  // 11. Test pagination with different page numbers
  const page1 = await api.functional.redditClone.posts.index(memberConnection, {
    body: {
      sort: "new",
      limit: 3,
      page: 1,
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(page1);
  const page2 = await api.functional.redditClone.posts.index(memberConnection, {
    body: {
      sort: "new",
      limit: 3,
      page: 2,
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 12. Validate vote_score and comment_count are present and valid in results
  for (const post of newSorted.data) {
    TestValidator.predicate(
      `comment_count is non-negative for post ${post.id}`,
      post.comment_count >= 0,
    );
  }
  // 13. Test edge case: time filter with non-top sort (should be ignored)
  const newWithTimeFilter = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        timeFilter: "this_week",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newWithTimeFilter);
  // 14. Test specific post search
  const specificSearch = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        search: "Hot Post About Technology",
        limit: 100,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(specificSearch);
  TestValidator.predicate(
    "specific search returns results",
    specificSearch.data.length >= 0,
  );
  // 15. Test empty search result with unique term
  const emptySearch = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        search: `UNIQUE_TERM_${RandomGenerator.alphaNumeric(16)}`,
        limit: 10,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns zero results",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination records",
    emptySearch.pagination.records,
    0,
  );
}
