import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that an unauthenticated guest can browse a community's post feed.
 *
 * Verifies the community feed endpoint is publicly accessible without
 * authentication. A member registers, creates a community, subscribes, and
 * publishes a post. A guest connection then queries the feed with default
 * parameters and receives a paginated response where every post belongs
 * exclusively to the target community.
 *
 * 1. Register a member via authorize_member_join on a dedicated connection.
 * 2. Create a community using generate_random_community_hub_member_communities_create.
 * 3. Subscribe the member to the community using the subscriptions SDK.
 * 4. Publish a text post via generate_random_community_hub_communities_posts_create.
 * 5. Query the community feed as a guest with an empty request body.
 * 6. Validate all returned posts belong to the requested community and
 *    that pagination metadata is consistent with the returned data.
 */
export async function test_api_community_feed_guest_browse_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 5. Guest queries the feed with default parameters
  const guestConnection: api.IConnection = { host: connection.host };
  const feed = await api.functional.communityHub.communities.feed.index(
    guestConnection,
    {
      communityName: community.name,
      body: {} satisfies ICommunityHubPost.IRequest,
    },
  );
  typia.assert(feed);
  // 6. Verify all posts belong to the community
  TestValidator.predicate("feed has posts", feed.data.length > 0);
  for (const item of feed.data) {
    TestValidator.equals(
      "post community name",
      item.community.name,
      community.name,
    );
  }
  // 7. Verify pagination consistency
  TestValidator.equals("current page", feed.pagination.current, 1);
  TestValidator.predicate(
    "records match data",
    feed.pagination.records >= feed.data.length,
  );
}
