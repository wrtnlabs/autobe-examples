import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_listing_home_feed_empty_subscription(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member user (no subscriptions)
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(userJoinResult);
  // Step 2: User is already authenticated via authorize_member_join (token set in headers)
  // Step 3: Create a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      userConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<1> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 4: Create a post in the community (user is owner)
  const post = await generate_random_reddit_platform_member_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // Step 5: Call HOME feed endpoint (user has no subscriptions)
  const homeFeedBefore: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(userConnection, {
      body: {
        sort_type: "NEW",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(homeFeedBefore);
  // Step 6: Verify empty result (no posts visible in HOME feed without subscriptions)
  TestValidator.equals(
    "HOME feed empty before subscription",
    homeFeedBefore.data.length,
    0,
  );
  TestValidator.equals(
    "Pagination records before subscription",
    homeFeedBefore.pagination.records,
    0,
  );
  TestValidator.equals(
    "Pagination pages before subscription",
    homeFeedBefore.pagination.pages,
    0,
  );
  // Step 7: Subscribe user to the community
  const subscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      userConnection,
      {
        body: {
          confirmSubscription: true,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Step 8: Call HOME feed endpoint again
  const homeFeedAfter: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(userConnection, {
      body: {
        sort_type: "NEW",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(homeFeedAfter);
  // Step 9: Verify post now appears in HOME feed
  TestValidator.equals(
    "HOME feed has posts after subscription",
    homeFeedAfter.data.length,
    1,
  );
  TestValidator.equals(
    "Pagination records after subscription",
    homeFeedAfter.pagination.records,
    1,
  );
  TestValidator.equals(
    "Pagination pages after subscription",
    homeFeedAfter.pagination.pages,
    1,
  );
  TestValidator.equals(
    "Post ID matches created post",
    homeFeedAfter.data[0].id,
    post.id,
  );
  TestValidator.equals(
    "Post title matches",
    homeFeedAfter.data[0].title,
    post.title,
  );
  TestValidator.equals(
    "Post community matches",
    homeFeedAfter.data[0].community.id,
    community.id,
  );
}
