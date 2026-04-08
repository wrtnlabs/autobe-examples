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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Test retrieving a soft-deleted subscription returns 404 Not Found error.
 *
 * Validates the soft-delete behavior of community subscriptions by creating an active subscription, deleting it (unsubscribing), and attempting to retrieve it by ID. The endpoint should return a 404 error because only active subscriptions (deleted_at is null) are accessible through the retrieve endpoint.
 *
 * This test ensures proper data privacy and soft-delete semantics where deleted subscriptions are not visible or accessible, even though the record is preserved in the database for audit purposes.
 *
 * 1. Authenticate a member user via the join endpoint
 * 2. Retrieve existing communities and select one for subscription
 * 3. Subscribe the member to the community to create an active subscription record
 * 4. Delete the subscription (unsubscribe) using the delete endpoint
 * 5. Attempt to retrieve the deleted subscription by its ID
 * 6. Validate that the retrieve operation throws an HTTP 404 error
 */
export async function test_api_subscription_retrieve_deleted_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Retrieve existing communities
  const communitiesResponse =
    await api.functional.redditClone.communities.index(memberConnection, {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(communitiesResponse);
  // Select first available community for subscription
  TestValidator.predicate(
    "at least one community exists for testing",
    communitiesResponse.data.length > 0,
  );
  const targetCommunity = communitiesResponse.data[0];
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: targetCommunity.id,
        },
      },
    );
  typia.assert(subscription);
  const subscriptionId = subscription.id;
  // 4. Delete the subscription (unsubscribe)
  await api.functional.redditClone.member.subscriptions.erase(
    memberConnection,
    {
      subscriptionId,
    },
  );
  // 5. Attempt to retrieve the deleted subscription
  await TestValidator.httpError(
    "retrieve deleted subscription returns 404",
    404,
    async () =>
      await api.functional.redditClone.member.subscriptions.at(
        memberConnection,
        {
          subscriptionId,
        },
      ),
  );
}
