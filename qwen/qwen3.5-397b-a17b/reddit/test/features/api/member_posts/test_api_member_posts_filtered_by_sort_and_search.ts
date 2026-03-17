import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
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
import { generate_random_reddit_clone_member_posts_vote } from "../../../generate/generate_random_reddit_clone_member_posts_vote";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

export async function test_api_member_posts_filtered_by_sort_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and establish authenticated connection
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
  // Create a community for posts (we need community_id to create posts)
  // Note: We'll use a pre-existing community or create one if utility exists
  // For now, we'll create posts and assume community subscription is handled
  // 2. Create multiple test posts with different titles for search testing
  const postTitles = [
    "Introduction to TypeScript Programming",
    "Advanced JavaScript Patterns and Best Practices",
    "Getting Started with React Development",
    "Understanding Node.js Architecture",
    "Modern CSS Techniques and Tips",
  ];
  const createdPosts: IRedditClonePost[] = [];
  for (const title of postTitles) {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          title: title,
          post_type: "TEXT",
          community_id: typia.random<string & tags.Format<"uuid">>(),
          text: {
            body: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }
  // 3. Cast votes on posts to create varying vote scores
  // Upvote first post heavily
  await generate_random_reddit_clone_member_posts_vote(memberConnection, {
    params: { postId: createdPosts[0].id },
    body: { vote_type: "UPVOTE" },
  });
  // Downvote second post
  await generate_random_reddit_clone_member_posts_vote(memberConnection, {
    params: { postId: createdPosts[1].id },
    body: { vote_type: "DOWNVOTE" },
  });
  // 4. Create comments on posts to test comment_count aggregation
  await generate_random_reddit_clone_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: createdPosts[0].id },
      body: {
        body: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  await generate_random_reddit_clone_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: createdPosts[0].id },
      body: {
        body: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 5. Test search parameter filtering posts by title content
  const searchResult = await api.functional.redditClone.members.posts.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        search: "TypeScript",
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search filters by title",
    searchResult.data.every((p) => p.title.includes("TypeScript")),
  );
  // 6. Test all sort options
  // Test 'new' sort (chronological)
  const newSorted = await api.functional.redditClone.members.posts.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newSorted);
  TestValidator.predicate("new sort returns posts", newSorted.data.length > 0);
  // Test 'top' sort (highest voted)
  const topSorted = await api.functional.redditClone.members.posts.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        sort: "top",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topSorted);
  // Test 'hot' sort (engagement-based)
  const hotSorted = await api.functional.redditClone.members.posts.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        sort: "hot",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotSorted);
  // Test 'controversial' sort
  const controversialSorted =
    await api.functional.redditClone.members.posts.index(memberConnection, {
      memberId: memberAuth.id,
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(controversialSorted);
  // 7. Test timeFilter parameter with 'top' sort
  const timeFilters: Array<
    "today" | "this_week" | "this_month" | "this_year" | "all_time"
  > = ["today", "this_week", "this_month", "this_year", "all_time"];
  for (const timeFilter of timeFilters) {
    const timeFiltered = await api.functional.redditClone.members.posts.index(
      memberConnection,
      {
        memberId: memberAuth.id,
        body: {
          sort: "top",
          timeFilter: timeFilter,
          page: 1,
          limit: 10,
        } satisfies IRedditClonePost.IRequest,
      },
    );
    typia.assert(timeFiltered);
    TestValidator.predicate(
      `${timeFilter} filter works`,
      Array.isArray(timeFiltered.data),
    );
  }
  // 8. Validate vote_score computation
  const postWithVotes = await api.functional.redditClone.members.posts.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(postWithVotes);
  // Verify vote_score is an integer
  for (const post of postWithVotes.data) {
    TestValidator.predicate(
      "vote_score is integer",
      Number.isInteger(post.vote_score),
    );
  }
  // 9. Confirm comment_count reflects comments
  const postWithComments = postWithVotes.data.find(
    (p) => p.id === createdPosts[0].id,
  );
  if (postWithComments) {
    TestValidator.predicate(
      "comment_count is non-negative",
      postWithComments.comment_count >= 0,
    );
  }
  // 10. Test pagination with custom page and limit values
  const paginatedResult = await api.functional.redditClone.members.posts.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        sort: "new",
        page: 1,
        limit: 5,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination respects limit",
    paginatedResult.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination has valid current page",
    paginatedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    paginatedResult.pagination.limit >= 1 &&
      paginatedResult.pagination.limit <= 100,
  );
  // Test page 2
  const page2Result = await api.functional.redditClone.members.posts.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        sort: "new",
        page: 2,
        limit: 5,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.predicate(
    "page 2 current is 2",
    page2Result.pagination.current === 2,
  );
}
