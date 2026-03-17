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

export async function test_api_comment_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://google.com",
    },
  });
  typia.assert(member1Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://google.com",
    },
  });
  typia.assert(member2Auth);
  // 2. Create a post with community_id
  const post = await api.functional.redditCommunity.member.posts.create(
    member1Connection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create multiple comments with different characteristics
  // 3.1 High vote score comment (member1) - for voteScoreMin test
  const highScoreComment1 =
    await generate_random_reddit_community_member_posts_comments_create(
      member1Connection,
      {
        body: { body: "High score comment" },
        params: { postId: post.id },
      },
    );
  typia.assert(highScoreComment1);
  // 3.2 Low vote score comment (member1)
  const lowScoreComment1 =
    await generate_random_reddit_community_member_posts_comments_create(
      member1Connection,
      {
        body: { body: "Low score comment" },
        params: { postId: post.id },
      },
    );
  typia.assert(lowScoreComment1);
  // 3.3 High vote score comment (member2)
  const highScoreComment2 =
    await generate_random_reddit_community_member_posts_comments_create(
      member2Connection,
      {
        body: { body: "High score comment from member2" },
        params: { postId: post.id },
      },
    );
  typia.assert(highScoreComment2);
  // 3.4 Deep nested comment (member1) - for depth filtering
  const topLevelComment =
    await generate_random_reddit_community_member_posts_comments_create(
      member1Connection,
      {
        body: { body: "Top level comment for nesting test" },
        params: { postId: post.id },
      },
    );
  typia.assert(topLevelComment);
  const nestedComment =
    await generate_random_reddit_community_member_posts_comments_create(
      member1Connection,
      {
        body: {
          body: "Nested reply to topLevelComment",
          parent_comment_id: topLevelComment.id,
        },
        params: { postId: post.id },
      },
    );
  typia.assert(nestedComment);
  // 3.5 Recent comment (member2) - for date filtering
  const recentComment =
    await generate_random_reddit_community_member_posts_comments_create(
      member2Connection,
      {
        body: { body: "Recent comment" },
        params: { postId: post.id },
      },
    );
  typia.assert(recentComment);
  // 4. Get all comments to establish baseline
  const allCommentsResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      member1Connection,
      {
        postId: post.id,
        body: { limit: 100 },
      },
    );
  typia.assert(allCommentsResponse);
  const allCommentsData = allCommentsResponse.data;
  const totalCommentsCount = allCommentsResponse.pagination.records;
  TestValidator.equals(
    "total comments count baseline",
    totalCommentsCount,
    allCommentsData.length,
  );
  // 5. Test authorId filter - filter by member1's ID
  const member1Id = member1Auth.token.access.split(".")[0];
  const authorFilterResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      member1Connection,
      {
        postId: post.id,
        body: {
          limit: 100,
          authorId: member1Id,
        },
      },
    );
  typia.assert(authorFilterResponse);
  TestValidator.equals(
    "author filter returns only member1 comments",
    authorFilterResponse.data.length,
    authorFilterResponse.data.filter((c) => c.author.id === member1Id).length,
  );
  // 6. Test vote score filtering
  const voteScoreFilterResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      member1Connection,
      {
        postId: post.id,
        body: {
          limit: 100,
          voteScoreMin: -100,
          voteScoreMax: 100,
        },
      },
    );
  typia.assert(voteScoreFilterResponse);
  TestValidator.predicate(
    "vote score filter returns valid scores within range",
    () =>
      voteScoreFilterResponse.data.every(
        (c) => c.voteScore >= -100 && c.voteScore <= 100,
      ),
  );
  // 7. Test date filtering
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const dateFilterResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      member1Connection,
      {
        postId: post.id,
        body: {
          limit: 100,
          afterDate: oneDayAgo.toISOString(),
        },
      },
    );
  typia.assert(dateFilterResponse);
  TestValidator.predicate(
    "date filter returns comments after specified date",
    () =>
      dateFilterResponse.data.every((c) => new Date(c.createdAt) >= oneDayAgo),
  );
  // 8. Test depth filtering - only top-level comments (maxDepth=0)
  const depthFilterResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      member1Connection,
      {
        postId: post.id,
        body: {
          limit: 100,
          maxDepth: 0,
        },
      },
    );
  typia.assert(depthFilterResponse);
  TestValidator.predicate("depth filter returns only top-level comments", () =>
    depthFilterResponse.data.every((c) => c.parentComment === null),
  );
  // 9. Test combined filtering - author AND vote score
  const combinedFilterResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      member1Connection,
      {
        postId: post.id,
        body: {
          limit: 100,
          authorId: member1Id,
          voteScoreMin: 0,
          maxDepth: 0,
        },
      },
    );
  typia.assert(combinedFilterResponse);
  TestValidator.predicate("combined filter returns matching comments", () =>
    combinedFilterResponse.data.every(
      (c) =>
        c.author.id === member1Id &&
        c.voteScore >= 0 &&
        c.parentComment === null,
    ),
  );
  // 10. Test pagination with filtering
  const paginationFilterResponse =
    await api.functional.redditCommunity.member.posts.comments.index(
      member1Connection,
      {
        postId: post.id,
        body: {
          page: 2,
          limit: 3,
          maxDepth: 0,
        },
      },
    );
  typia.assert(paginationFilterResponse);
  TestValidator.equals(
    "filtered pagination respects page and limit",
    paginationFilterResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "filtered pagination limit applied",
    paginationFilterResponse.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "filtered pagination data count",
    () => paginationFilterResponse.data.length <= 3,
  );
}
