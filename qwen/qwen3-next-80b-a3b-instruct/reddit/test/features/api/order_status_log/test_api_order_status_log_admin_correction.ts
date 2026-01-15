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
export async function test_api_order_status_log_admin_correction(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using the required utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // Step 2: Generate order ID and create initial status log entry
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  const logId: string = typia.random<string & tags.Format<"uuid">>();
  // Create initial status log entry with minimal required data
  const initialStatus: ICommunityPlatformOrderStatusLog["status"] = "pending";
  const initialComment: string = "Initial status log entry for testing";
  const createResponse =
    await api.functional.communityPlatform.admin.orders.status_logs.update(
      adminConnection,
      {
        orderId,
        logId,
        body: {
          status: initialStatus,
          notes: initialComment,
        } satisfies ICommunityPlatformOrderStatusLog.IUpdate,
      },
    );
  typia.assert(createResponse);
  // Step 3: Verify the newly created log entry
  const initialCreatedAt = createResponse.created_at;
  const initialCreatedByType: ICommunityPlatformOrderStatusLog["created_by_type"] =
    createResponse.created_by_type;
  const initialCreatedById: (string & tags.Format<"uuid">) | null =
    createResponse.created_by_id;
  // Step 4: Update the status log with new status and notes (administrative correction)
  const updatedStatus: ICommunityPlatformOrderStatusLog["status"] = "confirmed";
  const updatedComment: string =
    "Administrative correction: Status updated to confirmed following audit";
  const updateResponse =
    await api.functional.communityPlatform.admin.orders.status_logs.update(
      adminConnection,
      {
        orderId,
        logId,
        body: {
          status: updatedStatus,
          notes: updatedComment,
        } satisfies ICommunityPlatformOrderStatusLog.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // Step 5: Verify immutable fields were preserved
  TestValidator.equals(
    "created_at preserved",
    updateResponse.created_at,
    initialCreatedAt,
  );
  TestValidator.equals(
    "created_by_type preserved",
    updateResponse.created_by_type,
    initialCreatedByType,
  );
  TestValidator.equals(
    "created_by_id preserved",
    updateResponse.created_by_id,
    initialCreatedById,
  );
  // Step 6: Verify mutable fields were updated correctly
  TestValidator.equals(
    "status updated correctly",
    updateResponse.status,
    updatedStatus,
  );
  TestValidator.equals(
    "comment updated correctly",
    updateResponse.comment,
    updatedComment,
  );
}
