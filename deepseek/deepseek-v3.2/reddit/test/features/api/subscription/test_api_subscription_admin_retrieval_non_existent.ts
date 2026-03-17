import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin attempting to retrieve a subscription that does not exist.
 * Admin authenticates and attempts to retrieve a subscription with a random
 * UUID that doesn't exist in the database. Should receive 404 Not Found error.
 * Validate error response indicates subscription not found.
 */
export async function test_api_subscription_admin_retrieval_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Generate random UUID that doesn't exist in database
  const nonExistentSubscriptionId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;
  // Attempt to retrieve non-existent subscription - expect 404
  await TestValidator.httpError(
    "admin retrieving non-existent subscription should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.at(
        adminConnection,
        {
          subscriptionId: nonExistentSubscriptionId,
        },
      );
    },
  );
}
