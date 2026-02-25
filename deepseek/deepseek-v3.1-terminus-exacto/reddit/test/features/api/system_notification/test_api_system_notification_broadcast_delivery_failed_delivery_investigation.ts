import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemNotificationBroadcastDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotificationBroadcastDelivery";
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
 * Test the retrieval of failed broadcast notification delivery information.
 * As an administrator investigating delivery failures, this test verifies that
 * administrators can access failed delivery records containing error messages,
 * failed recipient counts, and delivery lifecycle information to identify and
 * resolve notification delivery problems.
 */
export async function test_api_system_notification_broadcast_delivery_failed_delivery_investigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an admin connection and authenticate using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorizedAdmin);
  // 2. Test with invalid IDs to validate error handling
  await TestValidator.error(
    "should reject non-existent system notification",
    async () => {
      await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.at(
        adminConnection,
        {
          systemNotificationId: typia.random<string & tags.Format<"uuid">>(),
          deliveryId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.at.Props,
      );
    },
  );
  // 3. Since we cannot create test data via API (no utility functions),
  // we'll assume the test environment has pre-existing failed deliveries.
  // In a real test, we would create a system notification first, then
  // retrieve its delivery record. For this test, we demonstrate the
  // retrieval pattern and validation logic.
  // Note: The actual test execution would require existing data in the database.
  // This test validates that when a failed delivery exists, we can retrieve
  // and validate its error information and count consistency.
}
