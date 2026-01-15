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
export async function test_api_order_status_log_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to own the order and status log
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const owner: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, { body: ownerData });
  // Step 2: Create an order to associate with the status log
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  // Create status log entry via POST /communityPlatform/member/orders/{orderId}/status-logs
  const statusLog: ICommunityPlatformOrderStatusLog =
    await generate_random_community_platform_member_orders_status_logs_create(
      ownerConnection,
      {
        body: {
          status: "pending",
        } satisfies ICommunityPlatformOrderStatusLog.ICreate,
        params: {
          orderId,
        },
      },
    );
  typia.assert(statusLog);
  // Step 3: Update the status log entry with new status and notes (by owner)
  // Use PUT /communityPlatform/member/orders/{orderId}/status-logs/{logId}
  const updatedLog: ICommunityPlatformOrderStatusLog =
    await api.functional.communityPlatform.member.orders.status_logs.update(
      ownerConnection,
      {
        orderId: statusLog.order_id,
        logId: statusLog.log_id!,
        body: {
          status: "confirmed",
          notes: "Update by member owner",
        } satisfies ICommunityPlatformOrderStatusLog.IUpdate,
      },
    );
  typia.assert(updatedLog);
  // Step 4: Validate that original created_at is preserved and comment was updated
  TestValidator.equals("status was updated", updatedLog.status, "confirmed");
  TestValidator.equals(
    "comment was updated (was notes in update body)",
    updatedLog.comment,
    "Update by member owner",
  );
  TestValidator.equals(
    "original created_at preserved",
    updatedLog.created_at,
    statusLog.created_at,
  );
  // Step 5: Attempt update by unauthorized member (must fail)
  const unauthorizedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedMemberData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const unauthorizedMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(unauthorizedMemberConnection, {
      body: unauthorizedMemberData,
    });
  await TestValidator.error(
    "unauthorized member cannot update status log",
    async () => {
      await api.functional.communityPlatform.member.orders.status_logs.update(
        unauthorizedMemberConnection,
        {
          orderId: statusLog.order_id,
          logId: statusLog.log_id!,
          body: {
            status: "shipped",
            notes: "Should fail",
          } satisfies ICommunityPlatformOrderStatusLog.IUpdate,
        },
      );
    },
  );
}
