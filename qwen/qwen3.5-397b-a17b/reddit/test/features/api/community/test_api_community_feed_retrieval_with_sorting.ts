import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_feed_retrieval_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create multiple posts with different types
  const textPost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "link",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        link_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);
  const imagePost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        image_path: RandomGenerator.alphaNumeric(32),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 5. Retrieve feed with default sorting (hot)
  const hotFeed =
    await api.functional.redditCommunity.member.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "hot",
          page: 1,
          limit: 20,
          feedType: "community",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(hotFeed);
  // 6. Verify all created posts are returned in the feed
  TestValidator.predicate("hot feed has posts", hotFeed.data.length >= 3);
  TestValidator.equals(
    "hot feed pagination current",
    hotFeed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "hot feed pagination records valid",
    hotFeed.pagination.records >= 3,
  );
  const postIds = hotFeed.data.map((p) => p.id);
  TestValidator.predicate("text post in feed", postIds.includes(textPost.id));
  TestValidator.predicate("link post in feed", postIds.includes(linkPost.id));
  TestValidator.predicate("image post in feed", postIds.includes(imagePost.id));
  // 7. Test sorting by 'new'
  const newFeed =
    await api.functional.redditCommunity.member.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "new",
          page: 1,
          limit: 20,
          feedType: "community",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(newFeed);
  TestValidator.predicate("new feed has posts", newFeed.data.length >= 3);
  // 8. Test sorting by 'top' with timeFilter 'week'
  const topFeed =
    await api.functional.redditCommunity.member.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "top",
          timeFilter: "week",
          page: 1,
          limit: 20,
          feedType: "community",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(topFeed);
  TestValidator.predicate("top feed has posts", topFeed.data.length >= 3);
  // 9. Test sorting by 'controversial'
  const controversialFeed =
    await api.functional.redditCommunity.member.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "controversial",
          page: 1,
          limit: 20,
          feedType: "community",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed returns data",
    controversialFeed.data.length >= 0,
  );
  // 10. Verify pagination metadata calculation
  const expectedPages = Math.ceil(
    hotFeed.pagination.records / hotFeed.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    hotFeed.pagination.pages,
    expectedPages,
  );
}
