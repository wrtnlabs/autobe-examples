import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_member_posts_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authentication setup - join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a test community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Test filtering by communityId
  const communityFiltered =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          communityId: community.id,
          limit: 20,
        },
      },
    );
  typia.assert(communityFiltered);
  // Verify all returned posts are from the specified community
  const allFromCommunity = communityFiltered.data.every(
    (post) => post.community.id === community.id,
  );
  TestValidator.equals("all posts from community", allFromCommunity, true);
  // 4. Test filtering by postType
  const textFiltered =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          postType: "text",
          limit: 20,
        },
      },
    );
  typia.assert(textFiltered);
  // Verify all returned posts are TEXT type
  const allTextPosts = textFiltered.data.every(
    (post) => post.post_type === "TEXT",
  );
  TestValidator.equals("all posts are TEXT type", allTextPosts, true);
  // 5. Test excludeTypes filter
  const excludeFiltered =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          excludeTypes: ["text", "link"],
          limit: 20,
        },
      },
    );
  typia.assert(excludeFiltered);
  // Verify no TEXT or LINK posts in results
  const noExcludedTypes = excludeFiltered.data.every(
    (post) => post.post_type === "IMAGE",
  );
  TestValidator.equals("no excluded post types", noExcludedTypes, true);
  // 6. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFiltered =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          dateRange: {
            startDate: oneWeekAgo.toISOString(),
            endDate: oneDayAgo.toISOString(),
          },
          limit: 20,
        },
      },
    );
  typia.assert(dateFiltered);
  // Verify all returned posts are within date range
  const allInDateRange = dateFiltered.data.every((post) => {
    const postDate = new Date(post.created_at);
    return postDate >= oneWeekAgo && postDate <= oneDayAgo;
  });
  TestValidator.equals("all posts in date range", allInDateRange, true);
  // 7. Test vote score range filtering
  const scoreFiltered =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          voteScoreRange: {
            min: 0,
            max: 100,
          },
          limit: 20,
        },
      },
    );
  typia.assert(scoreFiltered);
  // Verify all returned posts have score within range
  const allScoresInRange = scoreFiltered.data.every(
    (post) => post.vote_score >= 0 && post.vote_score <= 100,
  );
  TestValidator.equals("all votes in score range", allScoresInRange, true);
  // 8. Test composite filtering (communityId + postType)
  const compositeFiltered =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          communityId: community.id,
          postType: "text",
          limit: 20,
        },
      },
    );
  typia.assert(compositeFiltered);
  // Verify all posts match both criteria
  const compositeValid = compositeFiltered.data.every(
    (post) => post.community.id === community.id && post.post_type === "TEXT",
  );
  TestValidator.equals("composite filter valid", compositeValid, true);
  // 9. Test pagination with different limits
  const limitedFiltered =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          limit: 50,
        },
      },
    );
  typia.assert(limitedFiltered);
  TestValidator.equals("limit applied", limitedFiltered.pagination.limit, 50);
  // 10. Test pagination calculation
  const paginationFiltered =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          limit: 10,
        },
      },
    );
  typia.assert(paginationFiltered);
  // Verify pages calculation is correct
  const expectedPages = Math.ceil(paginationFiltered.pagination.records / 10);
  TestValidator.equals(
    "pages calculation correct",
    paginationFiltered.pagination.pages,
    expectedPages,
  );
  // 11. Test author filter with authenticated member
  const authorFiltered =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          authorId: memberAuth.user.id,
          limit: 20,
        },
      },
    );
  typia.assert(authorFiltered);
  // Verify all returned posts are from the authenticated member
  const allFromAuthor = authorFiltered.data.every(
    (post) => post.author.id === memberAuth.user.id,
  );
  TestValidator.equals("all posts from author", allFromAuthor, true);
}
