import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderStatusLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_status_log_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Create an order and its status log
  // Generate order data
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderStatus = "pending" as const;
  const createdByType = "system" as const;
  const createdAt = new Date().toISOString();
  // Generate logId for retrieving the status log
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the specific order status log
  const retrievedLog =
    await api.functional.communityPlatform.admin.orders.status_logs.at(
      adminConnection,
      {
        orderId: orderId,
        logId: logId,
      },
    );
  typia.assert(retrievedLog);
  // Step 4: Validate the retrieved log contains expected information
  TestValidator.equals("status matches", retrievedLog.status, orderStatus);
  TestValidator.equals(
    "created_by_type matches",
    retrievedLog.created_by_type,
    createdByType,
  );
  TestValidator.equals("logId matches", retrievedLog.log_id, logId);
  TestValidator.equals("order_id matches", retrievedLog.order_id, orderId);
  TestValidator.predicate("created_at has ISO format", () => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedLog.created_at as string,
    );
  });
  // Validate created_by_id is null since created_by_type is "system"
  TestValidator.equals(
    "created_by_id is null for system",
    retrievedLog.created_by_id,
    null,
  );
  // Validate comment is optional and undefined in this case
  // Since we didn't provide a comment, it should be undefined
  TestValidator.equals("comment is undefined", retrievedLog.comment, undefined);
}
