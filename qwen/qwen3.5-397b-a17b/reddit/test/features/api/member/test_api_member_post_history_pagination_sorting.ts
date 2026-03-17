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

export async function test_api_member_post_history_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create requester member (authenticated user who will query posts)
  const requesterConnection: api.IConnection = { host: connection.host };
  const requesterAuth = await authorize_member_join(requesterConnection, {
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
  typia.assert(requesterAuth);
  // 2. Create target member (whose posts will be queried)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
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
  typia.assert(targetAuth);
  const targetMemberId = targetAuth.id;
  // 3. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    targetConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 4. Subscribe target member to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      targetConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Create 15 posts by target member for pagination testing
  const postCount = 15;
  const createdPosts: IRedditClonePost[] = [];
  for (let i = 0; i < postCount; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      targetConnection,
      {
        body: {
          title: `Test Post ${i + 1}`,
          post_type: "TEXT",
          community_id: community.id,
          text: {
            body: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditClonePostText.ICreate,
        } satisfies IRedditClonePost.ICreate,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
    // Add small delay to ensure different timestamps for sorting
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 6. Test default pagination (page 1, default limit)
  const defaultResult =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "total records",
    defaultResult.pagination.records,
    postCount,
  );
  TestValidator.equals("current page", defaultResult.pagination.current, 1);
  TestValidator.equals("limit", defaultResult.pagination.limit, 10);
  TestValidator.predicate(
    "pages calculated correctly",
    defaultResult.pagination.pages === Math.ceil(postCount / 10),
  );
  TestValidator.predicate(
    "first page has 10 posts",
    defaultResult.data.length === 10,
  );
  // 7. Test page 2 with limit 10
  const page2Result =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "new",
          page: 2,
          limit: 10,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.predicate(
    "page 2 has remaining posts",
    page2Result.data.length === 5,
  );
  // 8. Test sorting by 'new' - verify chronological order (newest first)
  const newSortedResult =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "new",
          page: 1,
          limit: postCount,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(newSortedResult);
  TestValidator.equals(
    "new sort records",
    newSortedResult.pagination.records,
    postCount,
  );
  // Verify posts are in descending order by created_at
  for (let i = 0; i < newSortedResult.data.length - 1; i++) {
    const currentPost = newSortedResult.data[i];
    const nextPost = newSortedResult.data[i + 1];
    TestValidator.predicate(
      `post ${i} is newer than post ${i + 1}`,
      new Date(currentPost.created_at).getTime() >=
        new Date(nextPost.created_at).getTime(),
    );
  }
  // 9. Test sorting by 'top' with timeFilter
  const topTodayResult =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "top",
          timeFilter: "today",
          page: 1,
          limit: 10,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(topTodayResult);
  TestValidator.predicate(
    "top today has posts",
    topTodayResult.data.length > 0,
  );
  const topAllTimeResult =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "top",
          timeFilter: "all_time",
          page: 1,
          limit: 10,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(topAllTimeResult);
  TestValidator.equals(
    "top all_time records",
    topAllTimeResult.pagination.records,
    postCount,
  );
  // 10. Test limit boundary - minimum (1)
  const limit1Result =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "new",
          page: 1,
          limit: 1,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(limit1Result);
  TestValidator.equals("limit 1 current", limit1Result.pagination.current, 1);
  TestValidator.equals("limit 1 limit", limit1Result.pagination.limit, 1);
  TestValidator.equals(
    "limit 1 records",
    limit1Result.pagination.records,
    postCount,
  );
  TestValidator.equals(
    "limit 1 pages",
    limit1Result.pagination.pages,
    postCount,
  );
  TestValidator.predicate(
    "limit 1 returns 1 post",
    limit1Result.data.length === 1,
  );
  // 11. Test limit boundary - maximum (100)
  const limit100Result =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "new",
          page: 1,
          limit: 100,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(limit100Result);
  TestValidator.equals("limit 100 limit", limit100Result.pagination.limit, 100);
  TestValidator.predicate(
    "limit 100 returns all posts",
    limit100Result.data.length === postCount,
  );
  // 12. Test hot sorting
  const hotResult = await api.functional.redditClone.member.members.posts.index(
    requesterConnection,
    {
      memberId: targetMemberId,
      body: {
        sort: "hot",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotResult);
  TestValidator.equals(
    "hot sort records",
    hotResult.pagination.records,
    postCount,
  );
  // 13. Test controversial sorting
  const controversialResult =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "controversial",
          page: 1,
          limit: 10,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(controversialResult);
  TestValidator.equals(
    "controversial sort records",
    controversialResult.pagination.records,
    postCount,
  );
  // 14. Verify page navigation retrieves different subsets
  const page1Limit5 =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "new",
          page: 1,
          limit: 5,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(page1Limit5);
  const page2Limit5 =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "new",
          page: 2,
          limit: 5,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(page2Limit5);
  const page3Limit5 =
    await api.functional.redditClone.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "new",
          page: 3,
          limit: 5,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(page3Limit5);
  // Verify no overlap between pages
  const page1Ids = page1Limit5.data.map((p) => p.id);
  const page2Ids = page2Limit5.data.map((p) => p.id);
  const page3Ids = page3Limit5.data.map((p) => p.id);
  const hasOverlap12 = page1Ids.some((id) => page2Ids.includes(id));
  const hasOverlap23 = page2Ids.some((id) => page3Ids.includes(id));
  const hasOverlap13 = page1Ids.some((id) => page3Ids.includes(id));
  TestValidator.predicate("page 1 and 2 have no overlap", !hasOverlap12);
  TestValidator.predicate("page 2 and 3 have no overlap", !hasOverlap23);
  TestValidator.predicate("page 1 and 3 have no overlap", !hasOverlap13);
  // Verify all posts from 3 pages equal total
  const allPageIds = [...page1Ids, ...page2Ids, ...page3Ids];
  TestValidator.equals(
    "all pages cover all posts",
    allPageIds.length,
    postCount,
  );
}
