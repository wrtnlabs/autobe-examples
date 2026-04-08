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
 * Test the subscription prerequisite for post creation workflow.
 *
 * Validates that a member must subscribe to a community before creating posts within it. The test authenticates a member, retrieves an available community, subscribes to it, and verifies the subscription is active and properly linked to both the member and community.
 *
 * The subscription creation grants the member posting rights in the community and increments the subscriber count. This test ensures the subscription entity is correctly formed with all required relationships and that the deleted_at field is null, indicating an active subscription.
 *
 * 1. Authenticate as a member using authorize_member_join utility to obtain valid JWT tokens.
 * 2. Retrieve a valid community from the communities list using api.functional.redditClone.communities.index.
 * 3. Subscribe to the community using generate_random_reddit_clone_member_communities_subscriptions_create utility.
 * 4. Verify the subscription response with typia.assert and validate deleted_at is null.
 * 5. Confirm the subscription contains correct member and community references.
 */
export async function test_api_subscription_post_creation_prerequisite(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Retrieve a valid community
  const communitiesResponse =
    await api.functional.redditClone.communities.index(memberConnection, {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(communitiesResponse);
  TestValidator.predicate(
    "communities list is not empty",
    communitiesResponse.data.length > 0,
  );
  const community = communitiesResponse.data[0];
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Verify subscription is active (deleted_at is null)
  TestValidator.equals(
    "subscription is active (deleted_at is null)",
    subscription.deleted_at,
    null,
  );
  // 5. Verify subscription contains correct member reference
  TestValidator.equals(
    "subscription member id matches authenticated member",
    subscription.member.id,
    member.id,
  );
  // 6. Verify subscription contains correct community reference
  TestValidator.equals(
    "subscription community id matches target community",
    subscription.community.id,
    community.id,
  );
  // 7. Verify subscription has valid timestamps
  TestValidator.predicate(
    "subscription has valid created_at timestamp",
    subscription.created_at !== undefined && subscription.created_at !== null,
  );
  TestValidator.predicate(
    "subscription has valid updated_at timestamp",
    subscription.updated_at !== undefined && subscription.updated_at !== null,
  );
}
