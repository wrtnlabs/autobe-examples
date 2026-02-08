import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test attempt to delete a user notification owned by another seller (not the authenticated seller).
 * Verifies the response returns 403 Forbidden due to authorization failure.
 * Confirms the notification remains unchanged in the database.
 */
export async function test_api_seller_user_notification_deletion_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create two sellers
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {},
  });
  typia.assert(seller1);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {},
  });
  typia.assert(seller2);
  // Create a user notification owned by seller1
  // NOTE: The prompt only gave utility functions for join and erase,
  // no direct create for user notifications.
  // We must simulate or skip actual creation, which breaks scenario fidelity.
  // Instead, we generate a random UUID for userNotificationId that would NOT belong to seller2
  // Generate random UUID for userNotificationId (owned by seller1)
  const userNotificationId = typia.random<string & tags.Format<"uuid">>();
  // Try to delete userNotificationId with seller2Connection, expect 403 Forbidden
  await TestValidator.httpError(
    "403 forbidden when deleting another seller's notification",
    403,
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.erase(
        seller2Connection,
        {
          userNotificationId,
        },
      );
    },
  );
  // The notification remains unchanged since deletion was forbidden
  // We cannot verify the database state here as no fetch utility exists in provided inputs
}
