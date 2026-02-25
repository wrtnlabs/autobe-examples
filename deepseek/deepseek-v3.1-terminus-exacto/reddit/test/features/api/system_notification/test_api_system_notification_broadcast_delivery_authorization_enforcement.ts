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
 * Test authorization enforcement for system notification broadcast delivery endpoint.
 * This validates that only admin users can access delivery tracking information by testing
 * various unauthorized access scenarios.
 */
export async function test_api_system_notification_broadcast_delivery_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      permissions_level: "super_admin",
    },
  });
  typia.assert(admin);
  // Generate random UUIDs for testing
  const systemNotificationId = typia.random<string & tags.Format<"uuid">>();
  const deliveryId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Unauthenticated request should fail
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.at(
      unauthenticatedConnection,
      {
        systemNotificationId,
        deliveryId,
      },
    );
  });
  // Test 2: Connection with invalid token should fail
  const invalidConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid_token" },
  };
  await TestValidator.error("invalid token should fail", async () => {
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.at(
      invalidConnection,
      {
        systemNotificationId,
        deliveryId,
      },
    );
  });
  // Test 3: Empty authorization header should fail
  const emptyAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "" },
  };
  await TestValidator.error("empty authorization should fail", async () => {
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.at(
      emptyAuthConnection,
      {
        systemNotificationId,
        deliveryId,
      },
    );
  });
  // Test 4: Malformed authorization header should fail
  const malformedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "InvalidFormat invalid_token" },
  };
  await TestValidator.error("malformed authorization should fail", async () => {
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.at(
      malformedConnection,
      {
        systemNotificationId,
        deliveryId,
      },
    );
  });
  // Validate that admin can access the endpoint (positive test)
  const delivery =
    await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.at(
      adminConnection,
      {
        systemNotificationId,
        deliveryId,
      },
    );
  typia.assert(delivery);
}
