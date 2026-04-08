import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_home_feed_with_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Subscribe member to 2 communities (using mock community IDs)
  const communityId1 = typia.random<string & tags.Format<"uuid">>();
  const communityId2 = typia.random<string & tags.Format<"uuid">>();
  const subscription1 =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId1,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId2,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // 3. (Cannot create posts - no API available, skipping this step)
  // 4. Call home feed endpoint
  const homeFeed = await api.functional.redditCommunity.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(homeFeed);
  // 5. Validate pagination structure
  TestValidator.equals(
    "home feed pagination current page",
    homeFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "home feed pagination limit",
    homeFeed.pagination.limit,
    20,
  );
  TestValidator.notEquals(
    "home feed pagination records",
    homeFeed.pagination.records,
    undefined,
  );
  TestValidator.equals(
    "home feed pagination pages >= 0",
    homeFeed.pagination.pages >= 0,
    true,
  );
  // 6. Validate post data (if any exist)
  for (const post of homeFeed.data) {
    const isFromSubscribedCommunity =
      post.community.id === subscription1.community.id ||
      post.community.id === subscription2.community.id;
    TestValidator.equals(
      `post ${post.id} from subscribed community`,
      isFromSubscribedCommunity,
      true,
    );
    TestValidator.equals("post has id", typeof post.id, "string");
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.equals(
      "post has post_type",
      post.post_type === "text" ||
        post.post_type === "link" ||
        post.post_type === "image",
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      typeof post.vote_score,
      "number",
    );
    TestValidator.equals(
      "post has comment_count",
      typeof post.comment_count,
      "number",
    );
    TestValidator.equals(
      "post has created_at",
      typeof post.created_at,
      "string",
    );
    TestValidator.notEquals("post has author", post.author, undefined);
    TestValidator.notEquals("post has community", post.community, undefined);
  }
}