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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_home_feed_sorting_and_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
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
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create multiple posts with varying titles for testing
  const post1 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Top Post Today High Score",
        post_type: "TEXT",
        community_id: community.id,
        text: { body: RandomGenerator.content({ paragraphs: 2 }) },
      },
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Medium Score Post Today",
        post_type: "TEXT",
        community_id: community.id,
        text: { body: RandomGenerator.content({ paragraphs: 1 }) },
      },
    },
  );
  typia.assert(post2);
  const post3 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Older Post This Week",
        post_type: "TEXT",
        community_id: community.id,
        text: { body: RandomGenerator.content({ paragraphs: 1 }) },
      },
    },
  );
  typia.assert(post3);
  const post4 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Ancient Post All Time",
        post_type: "TEXT",
        community_id: community.id,
        text: { body: RandomGenerator.content({ paragraphs: 1 }) },
      },
    },
  );
  typia.assert(post4);
  // 5. Test sort='new' - newest first
  const newSortResult =
    await api.functional.redditClone.member.feeds.home.index(memberConnection, {
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(newSortResult);
  TestValidator.predicate(
    "new sort returns posts",
    newSortResult.data.length > 0,
  );
  // 6. Test sort='top' with timeFilter='today'
  const topTodayResult =
    await api.functional.redditClone.member.feeds.home.index(memberConnection, {
      body: {
        sort: "top",
        timeFilter: "today",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(topTodayResult);
  // 7. Test sort='top' with timeFilter='this_week'
  const topWeekResult =
    await api.functional.redditClone.member.feeds.home.index(memberConnection, {
      body: {
        sort: "top",
        timeFilter: "this_week",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(topWeekResult);
  // 8. Test sort='top' with timeFilter='all_time'
  const topAllTimeResult =
    await api.functional.redditClone.member.feeds.home.index(memberConnection, {
      body: {
        sort: "top",
        timeFilter: "all_time",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(topAllTimeResult);
  TestValidator.predicate(
    "all_time returns at least as many as today",
    topAllTimeResult.data.length >= topTodayResult.data.length,
  );
  // 9. Test pagination
  const page1Result = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 has results or empty",
    page1Result.data.length <= 2,
  );
  const page2Result = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sort: "new",
        page: 2,
        limit: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  // 10. Test search functionality
  const searchResult = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sort: "new",
        search: "Top Post",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(searchResult);
  // 11. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    newSortResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    newSortResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    newSortResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    newSortResult.pagination.pages >= 0,
  );
  // 12. Validate time filter hierarchy
  TestValidator.predicate(
    "this_week includes today's posts",
    topWeekResult.data.length >= topTodayResult.data.length,
  );
  TestValidator.predicate(
    "all_time includes this week's posts",
    topAllTimeResult.data.length >= topWeekResult.data.length,
  );
}
