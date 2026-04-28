import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySubscription";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";

/**
 * Test an authenticated member retrieves their community subscription list with active status filter.
 *
 * Validates the retrieval flow including member registration, community creation, subscription establishment, and querying the subscription list endpoint. Ensures that the response contains the expected subscription record with correct community enrichment (name, description, icon_uri) and pagination metadata.
 *
 * 1. Authenticate as a member by registering a new account.
 * 2. Create a discussion community.
 * 3. Subscribe the authenticated member to that community.
 * 4. Query the subscription list endpoint with the authenticated member's ID and isActive: true filter.
 * 5. Verify the response returns one subscription with proper community enrichment and pagination metadata.
 */
export async function test_api_subscription_list_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  // 2. Create a discussion community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} satisfies DeepPartial<IREdditLikeCommunityCommunity.ICreate> },
    );
  // 3. Subscribe the authenticated member to the community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  // 4. Query the subscription list endpoint
  const response: IPageIRedditLikeCommunityCommunitySubscription.ISummary =
    await api.functional.redditLikeCommunity.member.users.subscriptions.index(
      memberConnection,
      {
        userId: member.id,
        body: {
          isActive: true,
        } satisfies IRedditLikeCommunityCommunitySubscription.IRequest,
      },
    );
  // 5. Validate response
  typia.assert(response);
  TestValidator.equals("pagination records", response.pagination.records, 1);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("data length", response.data.length, 1);
  const subscriptionRecord = response.data[0];
  TestValidator.equals(
    "subscription is active",
    subscriptionRecord.is_active,
    true,
  );
  TestValidator.equals(
    "community name matches",
    subscriptionRecord.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    subscriptionRecord.community.description,
    community.description,
  );
  TestValidator.equals(
    "community icon_uri matches",
    subscriptionRecord.community.icon_uri,
    community.icon_uri,
  );
  TestValidator.equals(
    "member id matches",
    subscriptionRecord.member.id,
    member.id,
  );
  TestValidator.predicate(
    "joined_at is populated",
    !!subscriptionRecord.joined_at,
  );
}
