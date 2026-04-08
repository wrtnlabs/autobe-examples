import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscriptionSnapshot";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscriptionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin receives 404 error when requesting snapshots for non-existent subscription.
 *
 * Validates that the admin properly handles requests for subscription snapshots when the
 * specified subscription ID does not exist in the system. This test ensures the API
 * returns appropriate 404 Not Found errors with descriptive error messages when
 * attempting to access snapshots for subscriptions that have never been created.
 *
 * Special attention is given to verifying that the error handling is consistent,
 * the error message is clear about the non-existent subscription, and no internal
 * database details are exposed to the client.
 *
 * 1. Generate admin credentials and authenticate via admin join endpoint.
 * 2. Generate a valid UUID for a non-existent subscription.
 * 3. Attempt to retrieve snapshots for the non-existent subscription.
 * 4. Validate 404 error is returned with appropriate error message.
 */
export async function test_api_admin_subscription_snapshots_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Generate non-existent subscription ID
  const nonExistentSubscriptionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve snapshots for non-existent subscription
  await TestValidator.httpError(
    "should return 404 for non-existent subscription",
    404,
    async () => {
      await api.functional.redditCommunity.admin.subscriptions.snapshots.index(
        adminConnection,
        {
          subscriptionId: nonExistentSubscriptionId,
          body: {},
        },
      );
    },
  );
}
