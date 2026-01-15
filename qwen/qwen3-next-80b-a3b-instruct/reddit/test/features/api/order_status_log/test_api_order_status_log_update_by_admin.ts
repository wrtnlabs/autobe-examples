import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderStatusLog";
import { prepare_random_community_platform_order_status_log } from "../../../prepare/prepare_random_community_platform_order_status_log";
import { generate_random_community_platform_member_orders_status_logs_create } from "../../../generate/generate_random_community_platform_member_orders_status_logs_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_status_log_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // Step 2: Create order with status log entry as member
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderStatusLog: ICommunityPlatformOrderStatusLog =
    await generate_random_community_platform_member_orders_status_logs_create(
      memberConnection,
      {
        body: {
          status: "pending", // First status in workflow
        } satisfies ICommunityPlatformOrderStatusLog.ICreate,
        params: { orderId },
      },
    );
  typia.assert(orderStatusLog);
  // Step 3: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // Step 4: Authenticate admin using the email from join
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail, // Use email from join input, not from adminAuth
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 5: Update order status log as admin
  const updatedLog: ICommunityPlatformOrderStatusLog =
    await api.functional.communityPlatform.member.orders.status_logs.update(
      adminConnection,
      {
        orderId: orderId,
        logId: orderStatusLog.log_id!, // log_id exists in response
        body: {
          status: "shipped", // Valid transition
          notes: "Admin updated status after quality check", // Admin-provided notes
        } satisfies ICommunityPlatformOrderStatusLog.IUpdate,
      },
    );
  typia.assert(updatedLog);
  // Step 6: Validation
  TestValidator.equals(
    "created_at preserved",
    updatedLog.created_at,
    orderStatusLog.created_at,
  );
  TestValidator.equals(
    "status updated to shipped",
    updatedLog.status,
    "shipped",
  );
  TestValidator.equals(
    "comment updated to notes",
    updatedLog.comment,
    "Admin updated status after quality check",
  );
  TestValidator.predicate(
    "status transition from pending to shipped",
    () =>
      orderStatusLog.status === "pending" && updatedLog.status === "shipped",
  );
}
