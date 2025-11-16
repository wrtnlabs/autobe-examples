import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

export async function test_api_subscription_admin_canceled_to_active_override(
  connection: api.IConnection,
) {
  // Step 1: Create a post to trigger subscription creation (prerequisite)
  // The post creation triggers an automatic subscription creation
  const communityCode: string = typia.random<string>();
  const postResponse: ICommunityPlatformPost = // Post creation returns a string ID
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode: communityCode,
        body: typia.random<ICommunityPlatformPost.ICreate>() satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(postResponse);

  // Step 2: Use the post response string as the subscriptionId
  const subscriptionId: string = postResponse;

  // Step 3: Update subscription from 'active' to 'canceled' (admin capability)
  // The system creates subscription as 'active' by default when post is created
  const canceledResult: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.admin.subscriptions.update(
      connection,
      {
        subscriptionId: subscriptionId,
        body: {
          status:
            "canceled" satisfies ICommunityPlatformSubscription.IUpdate["status"],
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(canceledResult);
  TestValidator.equals(
    "subscription status should be canceled after admin cancellation",
    canceledResult,
    "canceled",
  );

  // Step 4: Update subscription from 'canceled' back to 'active' (admin override scenario)
  const activeResult: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.admin.subscriptions.update(
      connection,
      {
        subscriptionId: subscriptionId,
        body: {
          status:
            "active" satisfies ICommunityPlatformSubscription.IUpdate["status"],
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(activeResult);

  // Step 5: Verify the subscription status was successfully updated to 'active' via admin override
  TestValidator.equals(
    "subscription status should be active after admin override",
    activeResult,
    "active",
  );
}
