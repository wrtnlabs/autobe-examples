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
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderStatusLog";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_order_status_log } from "../../../prepare/prepare_random_community_platform_order_status_log";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_admin_orders_status_logs_create } from "../../../generate/generate_random_community_platform_admin_orders_status_logs_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_status_update_with_comment_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create admin connection and join admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminpassword123";
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 3: Authenticate member to create an order
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 4: Generate random order using member connection with valid UUID
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: typia.random<string & tags.Format<"uuid">>(),
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        billing_address_id: typia.random<string & tags.Format<"uuid">>(),
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: "Standard Ground",
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 5: Authenticate admin to perform status update
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/dashboard",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 6: Create status log with detailed comment for audit trail
  const statusLog =
    await generate_random_community_platform_admin_orders_status_logs_create(
      adminConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          status: "confirmed",
          comment:
            "Admin override: Order was manually confirmed due to payment processing delay. Customer service team contacted customer who confirmed payment was successful. Order status updated to confirmed per policy 5.1.",
        } satisfies ICommunityPlatformOrderStatusLog.ICreate,
      },
    );
  typia.assert(statusLog);
  // Step 7: Validate that the comment field was preserved in the audit log
  TestValidator.equals(
    "comment should contain audit details",
    statusLog.comment,
    "Admin override: Order was manually confirmed due to payment processing delay. Customer service team contacted customer who confirmed payment was successful. Order status updated to confirmed per policy 5.1.",
  );
  // Step 8: Validate that status was correctly updated
  TestValidator.equals(
    "status should be confirmed",
    statusLog.status,
    "confirmed",
  );
  // Step 9: Validate that the status log was created by an admin user
  TestValidator.equals(
    "created_by_type should be user",
    statusLog.created_by_type,
    "user",
  );
  // Step 10: Verify that created_by_id is populated (admin user ID)
  await TestValidator.predicate(
    "created_by_id should not be null",
    statusLog.created_by_id !== null
  );
  // Step 11: Verify that member cannot perform status update (permission boundary test)
  await TestValidator.error(
    "member should not be able to update status",
    async () => {
      await api.functional.communityPlatform.admin.orders.status_logs.create(
        memberConnection,
        {
          orderId: order.id,
          body: {
            status: "shipped",
            comment: "This should be rejected",
          } satisfies ICommunityPlatformOrderStatusLog.ICreate,
        },
      );
    },
  );
}