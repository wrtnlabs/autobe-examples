import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_home_feed_empty_when_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with no subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Primary test: call home feed with no subscriptions — expect empty response
  const emptyFeed = await api.functional.community.member.feed.index(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(emptyFeed);
  TestValidator.equals("empty feed records", emptyFeed.pagination.records, 0);
  TestValidator.equals("empty feed data length", emptyFeed.data.length, 0);
  TestValidator.equals("empty feed pages", emptyFeed.pagination.pages, 0);
  // 3. Edge case: subscribe, post, verify feed has content, then unsubscribe and verify empty again
  // 3a. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3b. Subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 3c. Create a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3d. Verify the feed now contains the post
  const feedWithPost = await api.functional.community.member.feed.index(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedWithPost);
  TestValidator.equals(
    "feed with post records",
    feedWithPost.pagination.records,
    1,
  );
  TestValidator.equals(
    "feed with post data length",
    feedWithPost.data.length,
    1,
  );
  // 3e. Unsubscribe from the community
  await api.functional.community.member.communities.subscriptions.erase(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 3f. Verify the feed is now empty after unsubscription
  const feedAfterUnsub = await api.functional.community.member.feed.index(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedAfterUnsub);
  TestValidator.equals(
    "feed after unsub records",
    feedAfterUnsub.pagination.records,
    0,
  );
  TestValidator.equals(
    "feed after unsub data length",
    feedAfterUnsub.data.length,
    0,
  );
}
