import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderStatusLog";
import { prepare_random_community_platform_order_status_log } from "../../../prepare/prepare_random_community_platform_order_status_log";
import { generate_random_community_platform_member_orders_status_logs_create } from "../../../generate/generate_random_community_platform_member_orders_status_logs_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_order_status_log_update_no_changes(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Use member connection to create a new order status log entry
  // Generate a random order ID and status
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const status: ICommunityPlatformOrderStatusLog["status"] =
    RandomGenerator.pick([
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "completed",
      "cancelled",
    ] as const);
  const comment = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  // Create the status log entry using the generation function
  const statusLogEntry =
    await generate_random_community_platform_member_orders_status_logs_create(
      memberConnection,
      {
        params: { orderId },
        body: {
          status,
          comment,
        } satisfies ICommunityPlatformOrderStatusLog.ICreate,
      },
    );
  typia.assert(statusLogEntry);
  // Step 3: Attempt to update the status log entry with the same values
  // Create update payload with same status and comment (no changes)
  const updatePayload = {
    status: statusLogEntry.status,
    notes: statusLogEntry.comment ?? "",
  } satisfies ICommunityPlatformOrderStatusLog.IUpdate;
  // Perform the update with identical values
  const updatedLog =
    await api.functional.communityPlatform.member.orders.status_logs.update(
      memberConnection,
      {
        orderId: statusLogEntry.order_id,
        logId: statusLogEntry.log_id!,
        body: updatePayload,
      },
    );
  typia.assert(updatedLog);
  // Step 4: Validate that the update was processed successfully without modification
  // Only created_at should be preserved when no changes are made
  TestValidator.equals(
    "status unchanged",
    updatedLog.status,
    statusLogEntry.status,
  );
  TestValidator.equals(
    "comment unchanged",
    updatedLog.comment,
    statusLogEntry.comment,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedLog.created_at,
    statusLogEntry.created_at,
  );
  TestValidator.equals(
    "log_id preserved",
    updatedLog.log_id,
    statusLogEntry.log_id,
  );
  TestValidator.equals(
    "order_id preserved",
    updatedLog.order_id,
    statusLogEntry.order_id,
  );
  TestValidator.equals(
    "created_by_type preserved",
    updatedLog.created_by_type,
    statusLogEntry.created_by_type,
  );
  TestValidator.equals(
    "created_by_id preserved",
    updatedLog.created_by_id,
    statusLogEntry.created_by_id,
  );
  // No updated_at property exists in the DTO, so this validation is removed
}
