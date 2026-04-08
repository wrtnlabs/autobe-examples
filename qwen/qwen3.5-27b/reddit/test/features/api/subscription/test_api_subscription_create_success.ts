import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Test the primary success path for subscribing a member to a community.
 *
 * Validates the complete subscription creation flow including member authentication, community retrieval, and subscription establishment. Ensures that the subscription correctly references both the member and community, and that the subscription is active (deleted_at is null).
 *
 * Special attention is given to verifying that the subscription entity contains all required fields including member and community objects with their complete information, and that timestamps are properly set.
 *
 * 1. Authenticate as a member using the join operation to obtain valid JWT tokens.
 * 2. Retrieve a valid community from the communities list to use as the target for subscription.
 * 3. Call the subscription creation endpoint with the authenticated member's context and the communityId.
 * 4. Validate the subscription response structure using typia.assert.
 * 5. Verify the subscription is active (deleted_at is null).
 * 6. Verify member and community objects are properly populated with required fields.
 */
export async function test_api_subscription_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Retrieve a valid community
  const communitiesConnection: api.IConnection = { host: connection.host };
  const communities = await api.functional.redditClone.communities.index(
    communitiesConnection,
    {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(communities);
  // Ensure we have at least one community
  TestValidator.predicate(
    "communities list is not empty",
    communities.data.length > 0,
  );
  const targetCommunity = communities.data[0];
  typia.assert(targetCommunity);
  // 3. Create subscription
  const subscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        params: {
          communityId: targetCommunity.id,
        },
        body: {},
      },
    );
  typia.assert(subscription);
  // 4. Verify subscription is active
  TestValidator.equals(
    "subscription is active (deleted_at is null)",
    subscription.deleted_at,
    null,
  );
  // 5. Verify member object is populated
  TestValidator.equals(
    "member id matches authenticated member",
    subscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "member email matches authenticated member",
    subscription.member.email,
    member.email,
  );
  TestValidator.equals(
    "member username matches authenticated member",
    subscription.member.username,
    member.username,
  );
  // 6. Verify community object is populated
  TestValidator.equals(
    "community id matches target community",
    subscription.community.id,
    targetCommunity.id,
  );
  TestValidator.equals(
    "community name matches target community",
    subscription.community.name,
    targetCommunity.name,
  );
}
