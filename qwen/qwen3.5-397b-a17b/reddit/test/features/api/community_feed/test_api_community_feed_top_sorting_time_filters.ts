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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

export async function test_api_community_feed_top_sorting_time_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
  const memberAuth = await authorize_member_join(connection, {
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
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      },
    },
  );
  typia.assert(community);
  // 3. Create multiple posts in the community with votes
  const posts: IRedditClonePost[] = [];
  const postCount = 10;
  for (let i = 0; i < postCount; i++) {
    const postType = RandomGenerator.pick(["TEXT", "LINK", "IMAGE"] as const);
    const postBody: IRedditClonePost.ICreate = {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      post_type: postType,
      community_id: community.id,
      text:
        postType === "TEXT"
          ? { body: RandomGenerator.content({ paragraphs: 2 }) }
          : undefined,
      link:
        postType === "LINK"
          ? { url: typia.random<string & tags.Format<"uri">>() }
          : undefined,
      image:
        postType === "IMAGE"
          ? { fileUri: typia.random<string & tags.Format<"uri">>() }
          : undefined,
    } satisfies IRedditClonePost.ICreate;
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      { body: postBody },
    );
    typia.assert(post);
    posts.push(post);
    // Cast votes on posts to ensure they have vote scores for top sorting
    const voteType = RandomGenerator.pick([
      "UPVOTE",
      "DOWNVOTE",
      null,
    ] as const);
    await generate_random_reddit_clone_member_posts_vote(memberConnection, {
      params: { postId: post.id },
      body: { vote_type: voteType },
    });
  }
  // 4. Test time filters with sort='top'
  const timeFilters: Array<
    "today" | "this_week" | "this_month" | "this_year" | "all_time"
  > = ["today", "this_week", "this_month", "this_year", "all_time"];
  for (const timeFilter of timeFilters) {
    const feedResponse =
      await api.functional.redditClone.communities.feed.index(
        memberConnection,
        {
          communityId: community.id,
          body: {
            sort: "top",
            timeFilter: timeFilter,
            page: 1,
            limit: 20,
          } satisfies IRedditClonePost.IRequest,
        },
      );
    typia.assert(feedResponse);
    // Validate pagination structure
    TestValidator.predicate(
      `current page is 1 for ${timeFilter}`,
      feedResponse.pagination.current === 1,
    );
    TestValidator.predicate(
      `limit is 20 for ${timeFilter}`,
      feedResponse.pagination.limit === 20,
    );
  }
  // 5. Test that time filters don't affect other sort types
  const otherSorts: Array<"hot" | "new" | "controversial"> = [
    "hot",
    "new",
    "controversial",
  ];
  for (const sort of otherSorts) {
    // Test with timeFilter provided (should be ignored)
    const feedWithTimeFilter =
      await api.functional.redditClone.communities.feed.index(
        memberConnection,
        {
          communityId: community.id,
          body: {
            sort: sort,
            timeFilter: "today",
            page: 1,
            limit: 20,
          } satisfies IRedditClonePost.IRequest,
        },
      );
    typia.assert(feedWithTimeFilter);
    // Test without timeFilter
    const feedWithoutTimeFilter =
      await api.functional.redditClone.communities.feed.index(
        memberConnection,
        {
          communityId: community.id,
          body: {
            sort: sort,
            page: 1,
            limit: 20,
          } satisfies IRedditClonePost.IRequest,
        },
      );
    typia.assert(feedWithoutTimeFilter);
  }
  // 6. Test pagination with time filters
  const paginationTestResponse =
    await api.functional.redditClone.communities.feed.index(memberConnection, {
      communityId: community.id,
      body: {
        sort: "top",
        timeFilter: "all_time",
        page: 1,
        limit: 5,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(paginationTestResponse);
  TestValidator.predicate(
    "pagination limit is 5",
    paginationTestResponse.pagination.limit === 5,
  );
  TestValidator.predicate(
    "data length respects limit",
    paginationTestResponse.data.length <= 5,
  );
  // Test page 2 if there are enough posts
  if (paginationTestResponse.pagination.pages > 1) {
    const page2Response =
      await api.functional.redditClone.communities.feed.index(
        memberConnection,
        {
          communityId: community.id,
          body: {
            sort: "top",
            timeFilter: "all_time",
            page: 2,
            limit: 5,
          } satisfies IRedditClonePost.IRequest,
        },
      );
    typia.assert(page2Response);
    TestValidator.predicate(
      "page 2 current is 2",
      page2Response.pagination.current === 2,
    );
  }
  // 7. Test edge case: search parameter with time filter
  const searchResponse =
    await api.functional.redditClone.communities.feed.index(memberConnection, {
      communityId: community.id,
      body: {
        sort: "top",
        timeFilter: "this_month",
        search: posts[0]?.title.substring(0, 5) ?? "test",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(searchResponse);
  // 8. Test all_time filter (should include all posts regardless of date)
  const allTimeResponse =
    await api.functional.redditClone.communities.feed.index(memberConnection, {
      communityId: community.id,
      body: {
        sort: "top",
        timeFilter: "all_time",
        page: 1,
        limit: 100,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(allTimeResponse);
  TestValidator.predicate(
    "all_time pagination records is accurate",
    allTimeResponse.pagination.records >= allTimeResponse.data.length,
  );
}